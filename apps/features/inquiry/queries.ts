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
