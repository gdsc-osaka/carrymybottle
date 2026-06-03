'use server';

import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getDb } from '@/lib/db/client';
import { contactSchema } from './validation';
import { insertEmergencyContact, getStationWithRelations } from './queries';
import { sendAdminNotificationEmail } from './mail';

export type ContactActionResult =
  | { success: true }
  | { success: false; error: string };

export async function submitContactAction(
  formData: FormData
): Promise<ContactActionResult> {
  const raw = {
    stationId: formData.get('stationId'),
    issueType: formData.get('issueType'),
    message: formData.get('message'),
    reporterEmail: formData.get('reporterEmail'),
  };

  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) {
    const message =
      parsed.error.issues[0]?.message ?? '入力内容を確認してください';
    return { success: false, error: message };
  }

  const { env } = await getCloudflareContext({ async: true });
  const db = getDb(env.DB);
  const id = crypto.randomUUID();

  await insertEmergencyContact(db, id, parsed.data);

  const station = await getStationWithRelations(db, parsed.data.stationId);
  const subject = `緊急連絡: ${station?.name ?? parsed.data.stationId}`;

  await sendAdminNotificationEmail({
    stationName: station?.name ?? parsed.data.stationId,
    campusName: station?.campus?.name ?? '',
    buildingName: station?.building?.name ?? '',
    issueType: parsed.data.issueType,
    message: parsed.data.message,
    reporterEmail: parsed.data.reporterEmail,
    subject,
  });

  // #76 自動返信メール送信予定
  // #78 analytics イベント記録予定

  return { success: true };
}
