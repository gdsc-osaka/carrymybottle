import { getCloudflareContext } from '@opennextjs/cloudflare';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { trackEvent } from '@/lib/analytics/events';
import { isPrefetchRequest } from '@/lib/analytics/isPrefetchRequest';
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

  const isPrefetch = await isPrefetchRequest();

  if (!isPrefetch) {
    const events: Promise<void>[] = [
      trackEvent({
        eventName: 'water_station_detail_viewed',
        stationId: station.id,
        campusId: station.campusId,
        buildingId: station.buildingId,
        source,
      }),
    ];

    if (isQrAccess) {
      events.push(
        trackEvent({
          eventName: 'qr_code_scanned',
          stationId: station.id,
          campusId: station.campusId,
          buildingId: station.buildingId,
          source,
        })
      );
    }

    await Promise.all(events);
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

      <section aria-label="アクション" className="mt-auto flex flex-col gap-3">
        <Button asChild variant="destructive" size="lg">
          <Link href={`/contact/${station.id}`}>緊急連絡フォーム</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/requests">設置希望を見る・投票する</Link>
        </Button>
      </section>
    </main>
  );
}
