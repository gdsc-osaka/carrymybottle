import { StationDetailPage } from '@/features/stations/StationDetailPage';

export default async function Page(props: {
  params: Promise<{ stationId: string }>;
}) {
  // Next.js 16: params は Promise。使用前に必ず await する。
  const { stationId } = await props.params;
  return <StationDetailPage stationId={stationId} />;
}
