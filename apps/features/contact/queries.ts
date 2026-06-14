import { eq } from 'drizzle-orm';
import type { DB } from '@/lib/db/client';
import {
  buildings,
  campuses,
  emergencyContacts,
  stations,
} from '@/lib/db/schema';
import type { ContactInput } from './validation';

export async function getStationWithRelations(db: DB, stationId: string) {
  const [row] = await db
    .select()
    .from(stations)
    .leftJoin(campuses, eq(stations.campusId, campuses.id))
    .leftJoin(buildings, eq(stations.buildingId, buildings.id))
    .where(eq(stations.id, stationId))
    .limit(1);

  if (!row) return null;

  return {
    ...row.stations,
    campus: row.campuses,
    building: row.buildings,
  };
}

export async function updateAutoReplyError(
  db: DB,
  id: string,
  error: string
): Promise<void> {
  await db
    .update(emergencyContacts)
    .set({ autoReplyError: error })
    .where(eq(emergencyContacts.id, id));
}

export async function markAdminEmailSent(
  db: DB,
  id: string,
  sentAt: Date
): Promise<void> {
  await db
    .update(emergencyContacts)
    .set({ adminEmailSentAt: sentAt })
    .where(eq(emergencyContacts.id, id));
}

export async function markAutoReplySent(
  db: DB,
  id: string,
  sentAt: Date
): Promise<void> {
  await db
    .update(emergencyContacts)
    .set({ autoReplySentAt: sentAt })
    .where(eq(emergencyContacts.id, id));
}

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
