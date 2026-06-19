import { getCloudflareContext } from '@opennextjs/cloudflare';
import { InquiriesPage } from '@/features/admin/InquiriesPage';
import { getDb } from '@/lib/db/client';
import { getInquiries } from '@/features/admin/queries';

export default async function Page() {
  const { env } = await getCloudflareContext({ async: true });
  const db = getDb(env.DB);
  const inquiries = await getInquiries(db);
  return <InquiriesPage inquiries={inquiries} />;
}
