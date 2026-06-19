import { eq } from 'drizzle-orm';
import type { DB } from '@/lib/db/client';
import { inquiries } from '@/lib/db/schema';
import type { InquiryInput } from './validation';

export async function insertInquiry(
  db: DB,
  id: string,
  input: InquiryInput
): Promise<void> {
  await db.insert(inquiries).values({
    id,
    category: input.category,
    name: input.name ?? null,
    message: input.message,
    reporterEmail: input.reporterEmail,
    createdAt: new Date(),
  });
}

export async function markAdminEmailSent(
  db: DB,
  id: string,
  sentAt: Date
): Promise<void> {
  await db
    .update(inquiries)
    .set({ adminEmailSentAt: sentAt })
    .where(eq(inquiries.id, id));
}

export async function markAutoReplySent(
  db: DB,
  id: string,
  sentAt: Date
): Promise<void> {
  await db
    .update(inquiries)
    .set({ autoReplySentAt: sentAt })
    .where(eq(inquiries.id, id));
}

export async function updateAutoReplyError(
  db: DB,
  id: string,
  error: string
): Promise<void> {
  await db
    .update(inquiries)
    .set({ autoReplyError: error })
    .where(eq(inquiries.id, id));
}
