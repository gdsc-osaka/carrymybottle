'use server';

import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getDb } from '@/lib/db/client';
import { trackEvent } from '@/lib/analytics/events';
import { enforceRateLimit } from '@/lib/rate-limit';
import { inquirySchema } from './validation';
import { insertInquiry } from './queries';

export type InquiryActionResult =
  | { success: true }
  | { success: false; error: string };

/**
 * お問い合わせ送信。レート制限 → Zod 検証 → D1 保存 → イベント記録の順で処理する。
 *
 * メール通知（管理者通知 / 自動返信）は #203 で追加する。本 Action は保存と
 * イベント記録までを担う。
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

  await trackEvent({ eventName: 'inquiry_submitted' });

  return { success: true };
}
