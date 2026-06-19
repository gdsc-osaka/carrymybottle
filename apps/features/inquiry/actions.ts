'use server';

import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getDb } from '@/lib/db/client';
import { trackEvent } from '@/lib/analytics/events';
import { enforceRateLimit } from '@/lib/rate-limit';
import { inquirySchema } from './validation';
import {
  insertInquiry,
  markAdminEmailSent,
  markAutoReplySent,
  updateAutoReplyError,
} from './queries';
import { INQUIRY_CATEGORY_LABELS } from '@/lib/constants/inquiries';
import { sendAdminNotificationEmail, sendAutoReplyEmail } from './mail';

export type InquiryActionResult =
  | { success: true }
  | { success: false; error: string };

/**
 * お問い合わせ送信。レート制限 → Zod 検証 → D1 保存 → メール通知 → イベント記録の
 * 順で処理する。
 *
 * 成功/失敗の境界は緊急連絡（submitContactAction）に揃える：管理者通知は必須経路で
 * 失敗時はフォーム失敗扱い、自動返信の失敗はフォーム成功扱い + autoReplyError 記録。
 */
export async function submitInquiryAction(
  formData: FormData
): Promise<InquiryActionResult> {
  const rateLimit = await enforceRateLimit('inquiry');
  if (rateLimit.isErr() && rateLimit.error.type === 'RATE_LIMITED') {
    return {
      success: false,
      error:
        '短時間に送信が集中しています。しばらくしてから再度お試しください。',
    };
  }

  const raw = {
    category: formData.get('category'),
    name: formData.get('name') ?? undefined,
    message: formData.get('message'),
    reporterEmail: formData.get('reporterEmail'),
  };

  const parsed = inquirySchema.safeParse(raw);
  if (!parsed.success) {
    const message =
      parsed.error.issues[0]?.message ?? '入力内容を確認してください';
    return { success: false, error: message };
  }

  const { env } = await getCloudflareContext({ async: true });
  const db = getDb(env.DB);
  const id = crypto.randomUUID();

  await insertInquiry(db, id, parsed.data);

  const subject = `お問い合わせ: ${INQUIRY_CATEGORY_LABELS[parsed.data.category]}`;

  // 管理者通知は必須経路。失敗を握りつぶさず、ユーザーにも明示してリトライを促す。
  try {
    await sendAdminNotificationEmail({
      category: parsed.data.category,
      name: parsed.data.name,
      message: parsed.data.message,
      reporterEmail: parsed.data.reporterEmail,
      subject,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('[inquiry] admin notification failed:', errorMessage);
    return {
      success: false,
      error:
        '通知メールの送信に失敗しました。お手数ですが時間をおいて再度お試しください。',
    };
  }
  // 送信成功を記録（管理画面の送信状態表示に使う）。記録失敗は致命的ではない。
  await markAdminEmailSent(db, id, new Date()).catch(() => {});

  // 自動返信の失敗はフォーム成功扱い。失敗内容は autoReplyError に記録する。
  try {
    await sendAutoReplyEmail({
      category: parsed.data.category,
      message: parsed.data.message,
      reporterEmail: parsed.data.reporterEmail,
      subject: `【受付完了】${subject}`,
    });
    await markAutoReplySent(db, id, new Date()).catch(() => {});
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('[inquiry] auto-reply failed:', errorMessage);
    await updateAutoReplyError(db, id, errorMessage).catch(() => {});
  }

  await trackEvent({ eventName: 'inquiry_submitted' });

  return { success: true };
}
