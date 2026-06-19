import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getMailClient } from '@/lib/mail/client';
import { withDevSubjectPrefix } from '@/lib/mail/subject';
import {
  INQUIRY_CATEGORY_LABELS,
  type InquiryCategory,
} from '@/lib/constants/inquiries';

// お問い合わせ通知は緊急連絡と同じ宛先/送信元（EMERGENCY_CONTACT_TO/FROM）を流用する。
// DesignDoc §13.4 の環境変数セットに INQUIRY_* は定義されておらず、通知先も同一の
// 管理チームであるため、新規 env を増やさず緊急連絡の設定に揃える。

type AdminNotificationParams = {
  category: InquiryCategory;
  name?: string;
  message: string;
  reporterEmail: string;
  subject: string;
};

export async function sendAdminNotificationEmail(
  params: AdminNotificationParams
): Promise<void> {
  const { env } = await getCloudflareContext({ async: true });
  const to = env.EMERGENCY_CONTACT_TO;
  const from = env.EMERGENCY_CONTACT_FROM;
  if (!to || !from) {
    throw new Error(
      'EMERGENCY_CONTACT_TO or EMERGENCY_CONTACT_FROM is not configured'
    );
  }

  const adminUrl = `${env.APP_BASE_URL}/admin/inquiries`;
  const resend = await getMailClient();

  const { error } = await resend.emails.send({
    from,
    to,
    subject: withDevSubjectPrefix(params.subject, env.APP_ENV),
    text: [
      '【お問い合わせ】',
      '',
      `種別: ${INQUIRY_CATEGORY_LABELS[params.category]}`,
      `お名前: ${params.name ?? '(未入力)'}`,
      '',
      '内容:',
      params.message,
      '',
      `送信者メールアドレス: ${params.reporterEmail}`,
      '',
      `管理画面: ${adminUrl}`,
    ].join('\n'),
  });

  // Resend は API エラー時に throw せず { error } を返すため、ここで明示的に
  // throw して呼び出し側で送信失敗を検知できるようにする（管理者通知は必須経路）。
  if (error) {
    throw new Error(`${error.name}: ${error.message}`);
  }
}

type AutoReplyParams = {
  category: InquiryCategory;
  message: string;
  reporterEmail: string;
  subject: string;
};

export async function sendAutoReplyEmail(
  params: AutoReplyParams
): Promise<void> {
  const { env } = await getCloudflareContext({ async: true });
  const from = env.EMERGENCY_CONTACT_FROM;
  if (!from) {
    throw new Error('EMERGENCY_CONTACT_FROM is not configured');
  }

  const resend = await getMailClient();

  const { error } = await resend.emails.send({
    from,
    to: params.reporterEmail,
    subject: withDevSubjectPrefix(params.subject, env.APP_ENV),
    text: [
      'このたびはお問い合わせいただきありがとうございます。',
      '以下の内容で受け付けました。確認次第、対応いたします。',
      '',
      `種別: ${INQUIRY_CATEGORY_LABELS[params.category]}`,
      '',
      '【お問い合わせ内容】',
      params.message,
      '',
      '※ 状況によってはキャリボトよりご連絡する場合があります。',
      '※ このメールは自動送信です。返信はできません。',
    ].join('\n'),
  });

  // Resend は API エラー時に throw せず { error } を返すため、
  // ここで明示的に throw して呼び出し側のフォールバックで記録できるようにする。
  if (error) {
    throw new Error(`${error.name}: ${error.message}`);
  }
}
