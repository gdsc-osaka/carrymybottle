import { getCloudflareContext } from '@opennextjs/cloudflare';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
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
}

/**
 * 給水機詳細ページ（Server Component）。
 *
 * 公開状態の給水機を取得し、給水機名・キャンパス・建物・説明を表示する。
 * ステータス／水温種別バッジ（#49・#50）、緊急連絡・設置希望への導線（#54・#55）は
 * 後続 Issue で各セクションを埋める。
 */
export async function StationDetailPage({ stationId }: StationDetailPageProps) {
  const { env } = await getCloudflareContext({ async: true });
  const db = getDb(env.DB);
  const station = await getPublicStationDetail(db, stationId);

  if (!station) {
    notFound();
  }

  // 複数の水温種別に対応するため、対応種別を冷水 → 常温水 → 温水の順に並べる。
  const temperatureTypes = STATION_TEMPERATURE_ORDER.filter((type) =>
    station.temperatures.some((t) => t.temperatureType === type)
  );

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col gap-6 p-4">
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
