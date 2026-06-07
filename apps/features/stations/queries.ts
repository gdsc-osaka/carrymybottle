import { and, eq } from 'drizzle-orm';
import type { DB } from '@/lib/db/client';
import {
  buildings,
  campuses,
  stationTemperatures,
  stations,
} from '@/lib/db/schema';
import type { StationWithRelations } from '@/lib/db/types';

/**
 * 公開状態の給水機詳細を、キャンパス・建物・対応水温種別とともに取得する。
 *
 * 給水機詳細ページ（`/stations/[stationId]`）は公開状態の給水機のみを対象とするため、
 * `is_public = true` で絞り込む。見つからない・非公開・関連レコード欠落の場合は `null` を返す。
 *
 * DesignDoc §2.4: 給水機情報の読み取りはこの stations feature を所有元とする。
 */
export async function getPublicStationDetail(
  db: DB,
  stationId: string
): Promise<StationWithRelations | null> {
  const [row] = await db
    .select()
    .from(stations)
    .leftJoin(campuses, eq(stations.campusId, campuses.id))
    .leftJoin(buildings, eq(stations.buildingId, buildings.id))
    .where(and(eq(stations.id, stationId), eq(stations.isPublic, true)))
    .limit(1);

  if (!row || !row.campuses || !row.buildings) return null;

  const temperatures = await db
    .select()
    .from(stationTemperatures)
    .where(eq(stationTemperatures.stationId, stationId));

  return {
    ...row.stations,
    campus: row.campuses,
    building: row.buildings,
    temperatures,
  };
}
