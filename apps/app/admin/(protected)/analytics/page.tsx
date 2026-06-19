import { getCloudflareContext } from '@opennextjs/cloudflare';
import { AnalyticsPage } from '@/features/admin/AnalyticsPage';
import { getDb } from '@/lib/db/client';
import { getQrAnalytics } from '@/features/admin/queries';

export default async function Page() {
  const { env } = await getCloudflareContext({ async: true });
  const db = getDb(env.DB);

  const environment = env.APP_ENV || 'development';
  const analytics = await getQrAnalytics(db, environment);

  return <AnalyticsPage analytics={analytics} />;
}
