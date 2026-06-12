'use server';

import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getDb } from '@/lib/db/client';
import { contactSchema } from './validation';
import {
  insertEmergencyContact,
  getStationWithRelations,
  updateAutoReplyError,
} from './queries';
import { sendAdminNotificationEmail, sendAutoReplyEmail } from './mail';
import { trackEvent } from '@/lib/analytics/events';
import { enforceRateLimit } from '@/lib/rate-limit';

export type ContactActionResult =
  | { success: true }
  | { success: false; error: string };

export async function submitContactAction(
  formData: FormData
): Promise<ContactActionResult> {
  const rateLimit = await enforceRateLimit('contact');
  if (rateLimit.isErr() && rateLimit.error.type === 'RATE_LIMITED') {
    return {
      success: false,
      error:
        '短時間に送信が集中しています。しばらくしてから再度お試しください。',
    };
  }

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
  const baseSubject = `緊急連絡: ${station?.name ?? parsed.data.stationId}`;
  const subjectPrefix = env.APP_ENV === 'development' ? '[DEV] ' : '';
  const subject = `${subjectPrefix}${baseSubject}`;

  await sendAdminNotificationEmail({
    stationName: station?.name ?? parsed.data.stationId,
    campusName: station?.campus?.name ?? '',
    buildingName: station?.building?.name ?? '',
    issueType: parsed.data.issueType,
    message: parsed.data.message,
    reporterEmail: parsed.data.reporterEmail,
    subject,
  });

  try {
    await sendAutoReplyEmail({
      stationName: station?.name ?? parsed.data.stationId,
      issueType: parsed.data.issueType,
      message: parsed.data.message,
      reporterEmail: parsed.data.reporterEmail,
      subject: `【受付完了】${subject}`,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('[contact] auto-reply failed:', errorMessage);
    await updateAutoReplyError(db, id, errorMessage).catch(() => {});
  }

  await trackEvent({
    eventName: 'emergency_form_submitted',
    stationId: parsed.data.stationId,
  });

  return { success: true };
}
