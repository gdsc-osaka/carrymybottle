import { getCloudflareContext } from '@opennextjs/cloudflare';
import { RequestsPage } from '@/features/requests/RequestsPage';
import { getInstallationRequestBuildings } from '@/features/requests/queries';
import { CAMPUSES, type CampusId } from '@/lib/constants/campuses';
import { getDb } from '@/lib/db/client';

type SearchParams = Promise<{
  [key: string]: string | string[] | undefined;
}>;

function isCampusId(value: string): value is CampusId {
  return CAMPUSES.some((item) => item.id === value);
}

function getSelectedCampusId(campus: string | string[] | undefined): CampusId {
  if (typeof campus === 'string' && isCampusId(campus)) {
    return campus;
  }

  return 'toyonaka';
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
  const buildingsResult = await getInstallationRequestBuildings(
    db,
    selectedCampusId
  );
  const buildings = buildingsResult.isOk() ? buildingsResult.value : [];
  const loadError = buildingsResult.isErr()
    ? 'リクエスト状況を読み込めませんでした。時間をおいて再読み込みしてください。'
    : undefined;

  return (
    <RequestsPage
      campuses={CAMPUSES}
      selectedCampusId={selectedCampusId}
      buildings={buildings}
      loadError={loadError}
    />
  );
}
