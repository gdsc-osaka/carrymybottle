import type { DB } from '@/lib/db/client';
import { emergencyContacts } from '@/lib/db/schema';
import type { ContactInput } from './validation';

export async function insertEmergencyContact(
  db: DB,
  id: string,
  input: ContactInput
): Promise<void> {
  await db.insert(emergencyContacts).values({
    id,
    stationId: input.stationId,
    issueType: input.issueType,
    message: input.message,
    reporterEmail: input.reporterEmail,
    createdAt: new Date(),
  });
}
