import { and, asc, eq, inArray } from 'drizzle-orm';
import type { DB } from '@/lib/db/client';
import {
  buildings,
  campuses,
  installationTargets,
  stations,
  stationTemperatures,
} from '@/lib/db/schema';

export async function getStationsByCampus(db: DB, campusId: string) {
  const rows = await db
    .select()
    .from(stations)
    .innerJoin(campuses, eq(stations.campusId, campuses.id))
    .innerJoin(buildings, eq(stations.buildingId, buildings.id))
    .where(and(eq(stations.campusId, campusId), eq(stations.isPublic, true)))
    .orderBy(asc(stations.name));

  if (rows.length === 0) return [];

  const stationIds = rows.map((r) => r.stations.id);
  const temps = await db
    .select()
    .from(stationTemperatures)
    .where(inArray(stationTemperatures.stationId, stationIds));

  return rows.map((row) => ({
    ...row.stations,
    campus: row.campuses,
    building: row.buildings,
    temperatures: temps.filter((t) => t.stationId === row.stations.id),
  }));
}

/** 地図上のインライン投票候補となる建物（座標 + 現在の投票数）。 */
export interface MapVoteBuilding {
  campusId: string;
  buildingId: string;
  buildingName: string;
  latitude: number;
  longitude: number;
  voteCount: number;
  /** その建物に給水機が登録済みか。設置済みは設置希望の対象外（投票不可）。 */
  hasStation: boolean;
}

/**
 * キャンパス内の建物を、現在の設置希望投票数とともに取得する。地図タップ
 * （クロスヘア）地点の近接建物抽出に使うため、座標が未設定の建物は除外する。
 *
 * 近接度の計算はクライアント側（{@link nearestBuildings}）で行う。建物数は
 * キャンパスあたり数件と小さく、タップのたびにサーバー往復するより、一度
 * まとめて渡してクライアントで距離計算する方が応答が速く実装も単純なため。
 */
export async function getMapVoteBuildings(
  db: DB,
  campusId: string
): Promise<MapVoteBuilding[]> {
  const rows = await db
    .select({
      campusId: buildings.campusId,
      buildingId: buildings.id,
      buildingName: buildings.name,
      latitude: buildings.latitude,
      longitude: buildings.longitude,
      voteCount: installationTargets.voteCount,
    })
    .from(buildings)
    .leftJoin(
      installationTargets,
      and(
        eq(installationTargets.buildingId, buildings.id),
        eq(installationTargets.campusId, buildings.campusId)
      )
    )
    .where(eq(buildings.campusId, campusId))
    .orderBy(asc(buildings.sortOrder), asc(buildings.name));

  // 給水機が登録済みの建物ID集合。設置済みの建物は設置希望の対象外にするため、
  // 建物に対する「設置済み」フラグを付与する（公開/非公開・稼働状態は問わず、
  // レコードが存在すれば設置済みとみなす）。
  const stationBuildingRows = await db
    .selectDistinct({ buildingId: stations.buildingId })
    .from(stations)
    .where(eq(stations.campusId, campusId));
  const buildingIdsWithStation = new Set(
    stationBuildingRows.map((r) => r.buildingId)
  );

  return rows.flatMap((row) =>
    row.latitude != null && row.longitude != null
      ? [
          {
            campusId: row.campusId,
            buildingId: row.buildingId,
            buildingName: row.buildingName,
            latitude: row.latitude,
            longitude: row.longitude,
            voteCount: row.voteCount ?? 0,
            hasStation: buildingIdsWithStation.has(row.buildingId),
          },
        ]
      : []
  );
}
