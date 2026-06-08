import { getCloudflareContext } from '@opennextjs/cloudflare';
import { RequestsPage } from '@/features/requests/RequestsPage';
import { getInstallationRequestBuildings } from '@/features/requests/queries';
import { CAMPUSES, type CampusId } from '@/lib/constants/campuses';
import { getDb } from '@/lib/db/client';

type SearchParams = Promise<{
  [key: string]: string | string[] | undefined;
}>;

function getSelectedCampusId(campus: string | string[] | undefined): CampusId {
  const campusId = typeof campus === 'string' ? campus : 'toyonaka';
  return CAMPUSES.some((item) => item.id === campusId)
    ? (campusId as CampusId)
    : 'toyonaka';
}

export default async function Page({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const selectedCampusId = getSelectedCampusId(params.campus);
  const { env } = await getCloudflareContext({ async: true });
  const db = getDb(env.DB);
  const buildings = await getInstallationRequestBuildings(db, selectedCampusId);

  return (
    <RequestsPage
      campuses={CAMPUSES}
      selectedCampusId={selectedCampusId}
      buildings={buildings}
    />
  );
}
