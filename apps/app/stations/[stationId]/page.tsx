import { StationDetailPage } from '@/features/stations/StationDetailPage';

export default async function Page(props: {
  params: Promise<{ stationId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Next.js 16: params / searchParams は Promise。使用前に必ず await する。
  const { stationId } = await props.params;
  const { source } = await props.searchParams;
  // 同名パラメータが複数渡された場合は先頭の値を採用する。
  const sourceValue = Array.isArray(source) ? source[0] : source;
  return <StationDetailPage stationId={stationId} source={sourceValue} />;
}
