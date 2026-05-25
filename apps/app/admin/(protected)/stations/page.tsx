import { getCloudflareContext } from "@opennextjs/cloudflare";
import { StationsPage } from "@/features/admin/StationsPage";
import { getDb } from "@/lib/db/client";
import { getAllBuildings, getAllCampuses, getAllStations } from "@/features/admin/queries";

export default async function Page() {
  const { env } = await getCloudflareContext({ async: true });
  const db = getDb(env.DB);
  const [stations, campuses, buildings] = await Promise.all([
    getAllStations(db),
    getAllCampuses(db),
    getAllBuildings(db),
  ]);
  return <StationsPage stations={stations} campuses={campuses} buildings={buildings} />;
}
