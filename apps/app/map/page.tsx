import { CAMPUSES } from '@/lib/constants/campuses';
import { MapPage } from '@/features/map/MapPage';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const campusParam =
    typeof params.campus === 'string' ? params.campus : 'toyonaka';
  const selectedCampusId = CAMPUSES.some((c) => c.id === campusParam)
    ? campusParam
    : 'toyonaka';

  return <MapPage campusId={selectedCampusId} />;
}
