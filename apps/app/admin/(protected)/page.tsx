import { getCloudflareContext } from '@opennextjs/cloudflare';
import { AdminDashboardPage } from '@/features/admin/AdminDashboardPage';
import { getDb } from '@/lib/db/client';
import { getAdminStats } from '@/features/admin/queries';

export default async function Page() {
  const { env } = await getCloudflareContext({ async: true });
  const db = getDb(env.DB);
  const stats = await getAdminStats(db);
  return <AdminDashboardPage stats={stats} />;
}
