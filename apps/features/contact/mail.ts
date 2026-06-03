import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getMailClient } from '@/lib/mail/client';
import { ISSUE_TYPE_LABELS, type IssueType } from '@/lib/constants/contacts';

type AdminNotificationParams = {
  stationName: string;
  campusName: string;
  buildingName: string;
  issueType: IssueType;
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

  const adminUrl = `${env.APP_BASE_URL}/admin/contacts`;
  const resend = await getMailClient();

  await resend.emails.send({
    from,
    to,
    subject: params.subject,
    text: [
      `【緊急連絡】${params.stationName}`,
      '',
      `キャンパス: ${params.campusName}`,
      `建物: ${params.buildingName}`,
      `不具合の種類: ${ISSUE_TYPE_LABELS[params.issueType]}`,
      '',
      '内容:',
      params.message,
      '',
      `連絡者メールアドレス: ${params.reporterEmail}`,
      '',
      `管理画面: ${adminUrl}`,
    ].join('\n'),
  });
}
