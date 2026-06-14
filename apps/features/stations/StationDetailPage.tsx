import { getCloudflareContext } from '@opennextjs/cloudflare';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Droplet } from 'lucide-react';
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
      className="min-h-[100dvh] bg-[#f7f9fb]"
      data-qr-access={isQrAccess ? 'true' : undefined}
    >
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col gap-5 px-4 py-5 lg:max-w-5xl lg:gap-8 lg:px-8 lg:py-10">
        {/* マップへ戻る導線（QR 流入時も給水機のキャンパスへ着地する）。 */}
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 h-11 w-fit text-[#0f897f] hover:bg-[#0f897f]/10 hover:text-[#00685f] sm:h-7"
        >
          <Link href={`/map?campus=${station.campusId}`}>
            <ArrowLeft className="size-4" />
            マップに戻る
          </Link>
        </Button>

        {/* モバイルは縦積み、PC は「詳細 + アクション」の 2 カラム。 */}
        <div className="flex flex-1 flex-col gap-5 lg:grid lg:grid-cols-[1.7fr_1fr] lg:items-start lg:gap-8">
          {/* 詳細カード（ランディングの給水機カードに合わせたデザイン）。 */}
          <div className="rounded-[1.5rem] border border-[#0f897f]/15 bg-white p-6 shadow-sm lg:p-8">
            <header className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="inline-block rounded bg-[#00685f]/10 px-2 py-1 text-xs font-bold tracking-widest text-[#00685f]">
                  {station.campus.name}
                </span>
                <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#191c1e] lg:text-3xl">
                  {station.name}
                </h1>
                <p className="mt-1 text-sm text-[#3d4947] lg:text-base">
                  {station.building.name}
                </p>
              </div>
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0f897f] to-[#1f6fc4] text-white shadow-md shadow-[#1f6fc4]/25 lg:size-14">
                <Droplet
                  className="size-5 fill-current lg:size-6"
                  aria-hidden="true"
                />
              </span>
            </header>

            {station.description ? (
              <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-[#46595a] lg:text-base">
                {station.description}
              </p>
            ) : null}

            <section
              aria-label="給水機の状態"
              className="mt-5 flex flex-wrap gap-2 lg:mt-6"
            >
              <Badge variant={STATION_STATUS_BADGE_VARIANT[station.status]}>
                {STATION_STATUS_LABELS[station.status]}
              </Badge>
              {temperatureTypes.map((type) => (
                <Badge key={type} variant="outline">
                  {STATION_TEMPERATURE_LABELS[type]}
                </Badge>
              ))}
            </section>
          </div>

          {/* アクション: モバイルは画面下部、PC はサイドのカードに収める。 */}
          <section
            aria-label="アクション"
            className="mt-auto flex flex-col gap-3 lg:mt-0 lg:rounded-[1.5rem] lg:border lg:border-[#0f897f]/15 lg:bg-white lg:p-6 lg:shadow-sm"
          >
            <p className="hidden text-sm font-semibold text-[#3d4947] lg:block">
              この給水機について
            </p>
            <Button
              asChild
              variant="destructive"
              size="lg"
              className="h-12 text-base sm:h-9 sm:text-sm"
            >
              <Link href={`/contact/${station.id}`}>緊急連絡フォーム</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 text-base sm:h-9 sm:text-sm"
            >
              <Link href="/requests">設置希望を見る・投票する</Link>
            </Button>
          </section>
        </div>
      </div>
    </main>
  );
}
