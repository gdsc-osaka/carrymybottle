'use server';

import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getDb } from '@/lib/db/client';
import { contactSchema } from './validation';
import { insertEmergencyContact } from './queries';

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

  // #75 管理者通知メール送信予定
  // #76 自動返信メール送信予定
  // #78 analytics イベント記録予定

  return { success: true };
}
