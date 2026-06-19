import { getCloudflareContext } from '@opennextjs/cloudflare';
import { BuildingsPage } from '@/features/admin/BuildingsPage';
import { getDb } from '@/lib/db/client';
import { getAllBuildings, getAllCampuses } from '@/features/admin/queries';

export default async function Page() {
  const { env } = await getCloudflareContext({ async: true });
  const db = getDb(env.DB);
  const [buildings, campuses] = await Promise.all([
    getAllBuildings(db),
    getAllCampuses(db),
  ]);
  return <BuildingsPage buildings={buildings} campuses={campuses} />;
}
