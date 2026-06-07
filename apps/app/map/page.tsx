import { getCloudflareContext } from '@opennextjs/cloudflare';
import { MapPage } from '@/features/map/MapPage';
import { getStationsByCampus } from '@/features/map/queries';
import { getDb } from '@/lib/db/client';
import { CAMPUSES } from '@/lib/constants/campuses';
import { trackEvent } from '@/lib/analytics/events';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { env } = await getCloudflareContext({ async: true });
  const db = getDb(env.DB);

  const params = await searchParams;
  const campusParam =
    typeof params.campus === 'string' ? params.campus : 'toyonaka';
  const selectedCampusId = CAMPUSES.some((c) => c.id === campusParam)
    ? campusParam
    : 'toyonaka';

  const stations = await getStationsByCampus(db, selectedCampusId);

  await trackEvent({
    eventName: 'map_viewed',
    campusId: selectedCampusId,
  });

  return <MapPage stations={stations} />;
}
