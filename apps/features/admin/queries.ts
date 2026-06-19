import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  or,
  sql,
} from 'drizzle-orm';
import type { DB } from '@/lib/db/client';
import {
  adminAuditEvents,
  buildings,
  campuses,
  emergencyContacts,
  inquiries,
  installationComments,
  installationTargets,
  stationTemperatures,
  stations,
  analyticsEvents,
} from '@/lib/db/schema';

export async function getAllStations(db: DB) {
  const rows = await db
    .select()
    .from(stations)
    .leftJoin(campuses, eq(stations.campusId, campuses.id))
    .leftJoin(buildings, eq(stations.buildingId, buildings.id))
    .orderBy(asc(stations.campusId), asc(stations.name));

  if (rows.length === 0) return [];

  const stationIds = rows.map((r) => r.stations.id);
  const temps = await db
    .select()
    .from(stationTemperatures)
    .where(inArray(stationTemperatures.stationId, stationIds));

  return rows.map((row) => ({
    ...row.stations,
    campus: row.campuses!,
    building: row.buildings!,
    temperatures: temps.filter((t) => t.stationId === row.stations.id),
  }));
}

export async function getStationById(db: DB, id: string) {
  const [row] = await db
    .select()
    .from(stations)
    .leftJoin(campuses, eq(stations.campusId, campuses.id))
    .leftJoin(buildings, eq(stations.buildingId, buildings.id))
    .where(eq(stations.id, id))
    .limit(1);

  if (!row) return null;

  const temps = await db
    .select()
    .from(stationTemperatures)
    .where(eq(stationTemperatures.stationId, id));

  return {
    ...row.stations,
    campus: row.campuses!,
    building: row.buildings!,
    temperatures: temps,
  };
}

/** 給水機の現在の画像キーのみを取得する（差し替え・削除時の旧オブジェクト削除に使う）。 */
export async function getStationImageKey(
  db: DB,
  id: string
): Promise<string | null> {
  const [row] = await db
    .select({ imageKey: stations.imageKey })
    .from(stations)
    .where(eq(stations.id, id))
    .limit(1);
  return row?.imageKey ?? null;
}

export async function getAllCampuses(db: DB) {
  return db.select().from(campuses).orderBy(asc(campuses.name));
}

export async function getBuildingsByCampus(db: DB, campusId: string) {
  return db
    .select()
    .from(buildings)
    .where(eq(buildings.campusId, campusId))
    .orderBy(asc(buildings.sortOrder), asc(buildings.name));
}

export async function getAllBuildings(db: DB) {
  return db
    .select()
    .from(buildings)
    .orderBy(asc(buildings.campusId), asc(buildings.sortOrder));
}

export async function getInstallationTargetsWithComments(
  db: DB,
  campusId?: string
) {
  const condition = campusId
    ? eq(installationTargets.campusId, campusId)
    : undefined;

  const rows = await db
    .select()
    .from(installationTargets)
    .leftJoin(campuses, eq(installationTargets.campusId, campuses.id))
    .leftJoin(buildings, eq(installationTargets.buildingId, buildings.id))
    .where(condition)
    .orderBy(desc(installationTargets.voteCount));

  const targetIds = rows.map((r) => r.installation_targets.id);
  if (targetIds.length === 0) return [];

  const comments = await db
    .select()
    .from(installationComments)
    .where(
      and(
        isNull(installationComments.deletedAt),
        inArray(installationComments.targetId, targetIds)
      )
    )
    .orderBy(asc(installationComments.createdAt));

  return rows.map((row) => ({
    ...row.installation_targets,
    campus: row.campuses!,
    building: row.buildings!,
    comments: comments.filter(
      (c) => c.targetId === row.installation_targets.id
    ),
  }));
}

export async function getEmergencyContacts(db: DB) {
  const rows = await db
    .select()
    .from(emergencyContacts)
    .leftJoin(stations, eq(emergencyContacts.stationId, stations.id))
    .where(isNull(emergencyContacts.deletedAt))
    .orderBy(desc(emergencyContacts.createdAt));

  return rows.map((row) => ({
    ...row.emergency_contacts,
    station: row.stations!,
  }));
}

export async function getInquiries(db: DB) {
  return db
    .select()
    .from(inquiries)
    .where(isNull(inquiries.deletedAt))
    .orderBy(desc(inquiries.createdAt));
}

export async function getAdminStats(db: DB) {
  const [stationRow, targetRow, contactRow, inquiryRow] = await Promise.all([
    db.select({ count: count() }).from(stations),
    db.select({ count: count() }).from(installationTargets),
    db
      .select({ count: count() })
      .from(emergencyContacts)
      .where(isNull(emergencyContacts.deletedAt)),
    db
      .select({ count: count() })
      .from(inquiries)
      .where(isNull(inquiries.deletedAt)),
  ]);
  return {
    stationCount: stationRow[0].count,
    targetCount: targetRow[0].count,
    contactCount: contactRow[0].count,
    inquiryCount: inquiryRow[0].count,
  };
}

export async function logAuditEvent(
  db: DB,
  action: string,
  targetType: string,
  targetId: string
) {
  // Audit log failure must not crash an already-successful mutation
  try {
    await db.insert(adminAuditEvents).values({
      id: crypto.randomUUID(),
      action,
      targetType,
      targetId,
      createdAt: new Date(),
    });
  } catch (error) {
    // Audit log is best-effort: never crash a successful mutation,
    // but surface the failure so a missing record is observable.
    console.error('logAuditEvent failed', {
      action,
      targetType,
      targetId,
      error,
    });
  }
}

export async function getQrAnalytics(db: DB, environment: string) {
  const scanCount =
    sql<number>`SUM(CASE WHEN ${analyticsEvents.eventName} = 'qr_code_scanned' THEN 1 ELSE 0 END)`.mapWith(
      Number
    );
  const viewCount =
    sql<number>`SUM(CASE WHEN ${analyticsEvents.eventName} = 'water_station_detail_viewed' THEN 1 ELSE 0 END)`.mapWith(
      Number
    );

  return db
    .select({
      stationId: stations.id,
      stationName: stations.name,
      campusName: campuses.name,
      buildingName: buildings.name,
      scanCount,
      viewCount,
    })
    .from(stations)
    .leftJoin(campuses, eq(stations.campusId, campuses.id))
    .leftJoin(buildings, eq(stations.buildingId, buildings.id))
    .leftJoin(
      analyticsEvents,
      and(
        eq(analyticsEvents.stationId, stations.id),
        eq(analyticsEvents.environment, environment),
        or(
          eq(analyticsEvents.eventName, 'qr_code_scanned'),
          and(
            eq(analyticsEvents.eventName, 'water_station_detail_viewed'),
            eq(analyticsEvents.source, 'qr')
          )
        )
      )
    )
    .groupBy(stations.id, stations.name, campuses.name, buildings.name)
    .having(or(gt(scanCount, 0), gt(viewCount, 0)))
    .orderBy(desc(scanCount), desc(viewCount));
}
