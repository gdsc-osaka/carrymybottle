import { getCloudflareContext } from '@opennextjs/cloudflare';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { trackEvent } from '@/lib/analytics/events';
import { getDb } from '@/lib/db/client';
import {
  STATION_STATUS_BADGE_VARIANT,
  STATION_STATUS_LABELS,
  STATION_TEMPERATURE_LABELS,
  STATION_TEMPERATURE_ORDER,
} from '@/lib/constants/stations';
import { getPublicStationDetail } from './queries';

interface StationDetailPageProps {
  stationId: string;
  /** アクセス経路。QR コード経由の場合は `'qr'`（`?source=qr`）。 */
  source?: string;
}

/**
 * 給水機詳細ページ（Server Component）。
 *
 * 公開状態の給水機を取得し、給水機名・キャンパス・建物・説明・各バッジを表示する。
 * `source=qr` で QR コード経由アクセスを検出する（DesignDoc §3.4 / §11.3）。
 * 緊急連絡・設置希望への導線（#54・#55）は後続 Issue で追加する。
 */
export async function StationDetailPage({
  stationId,
  source,
}: StationDetailPageProps) {
  const { env } = await getCloudflareContext({ async: true });
  const db = getDb(env.DB);
  const station = await getPublicStationDetail(db, stationId);

  if (!station) {
    notFound();
  }

  // QR コード経由アクセスの検出（DesignDoc §3.4 / §11.3）。
  const isQrAccess = source === 'qr';

  // 公開状態の給水機を取得できた後に詳細閲覧イベントを記録する（DesignDoc §12.1.1）。
  await trackEvent({
    eventName: 'water_station_detail_viewed',
    stationId: station.id,
    campusId: station.campusId,
    buildingId: station.buildingId,
    source,
  });

  // QR 経由アクセス時のみ、公開状態取得後に QR スキャンイベントを記録する（DesignDoc §12.1.1）。
  if (isQrAccess) {
    await trackEvent({
      eventName: 'qr_code_scanned',
      stationId: station.id,
      campusId: station.campusId,
      buildingId: station.buildingId,
      source,
    });
  }

  // 複数の水温種別に対応するため、対応種別を冷水 → 常温水 → 温水の順に並べる。
  const temperatureTypes = STATION_TEMPERATURE_ORDER.filter((type) =>
    station.temperatures.some((t) => t.temperatureType === type)
  );

  return (
    <main
      className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col gap-6 p-4"
      data-qr-access={isQrAccess ? 'true' : undefined}
    >
      <header className="flex flex-col gap-2">
        <h1 className="text-xl font-bold">{station.name}</h1>
        <p className="text-sm text-muted-foreground">
          {station.campus.name} ・ {station.building.name}
        </p>
        {station.description ? (
          <p className="whitespace-pre-wrap text-sm">{station.description}</p>
        ) : null}
      </header>

      <section aria-label="給水機の状態" className="flex flex-wrap gap-2">
        <Badge variant={STATION_STATUS_BADGE_VARIANT[station.status]}>
          {STATION_STATUS_LABELS[station.status]}
        </Badge>
        {temperatureTypes.map((type) => (
          <Badge key={type} variant="outline">
            {STATION_TEMPERATURE_LABELS[type]}
          </Badge>
        ))}
      </section>

      {/* #54: 緊急連絡フォーム / #55: 設置希望画面 への導線 */}
      <section aria-label="アクション" className="mt-auto flex flex-col gap-3">
        {/* 後続 Issue で導線ボタンを表示 */}
      </section>
    </main>
  );
}
