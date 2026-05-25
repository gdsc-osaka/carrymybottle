import { getCloudflareContext } from "@opennextjs/cloudflare";
import { RequestsPage } from "@/features/admin/RequestsPage";
import { getDb } from "@/lib/db/client";
import { getAllCampuses, getInstallationTargetsWithComments } from "@/features/admin/queries";

export default async function Page() {
  const { env } = await getCloudflareContext({ async: true });
  const db = getDb(env.DB);
  const [targets, campuses] = await Promise.all([
    getInstallationTargetsWithComments(db),
    getAllCampuses(db),
  ]);
  return <RequestsPage targets={targets} campuses={campuses} />;
}
