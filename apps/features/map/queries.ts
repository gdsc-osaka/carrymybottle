import { and, asc, eq, inArray } from 'drizzle-orm';
import type { DB } from '@/lib/db/client';
import {
  buildings,
  campuses,
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
