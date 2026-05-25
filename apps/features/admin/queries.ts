import { and, asc, desc, eq, isNull } from "drizzle-orm";
import type { DB } from "@/lib/db/client";
import {
  adminAuditEvents,
  buildings,
  campuses,
  emergencyContacts,
  installationComments,
  installationTargets,
  stationTemperatures,
  stations,
} from "@/lib/db/schema";

export async function getAllStations(db: DB) {
  const rows = await db
    .select()
    .from(stations)
    .leftJoin(campuses, eq(stations.campusId, campuses.id))
    .leftJoin(buildings, eq(stations.buildingId, buildings.id))
    .orderBy(asc(stations.campusId), asc(stations.name));

  const temps = await db.select().from(stationTemperatures);

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
  return db.select().from(buildings).orderBy(asc(buildings.campusId), asc(buildings.sortOrder));
}

export async function getInstallationTargetsWithComments(db: DB, campusId?: string) {
  const condition = campusId ? eq(installationTargets.campusId, campusId) : undefined;

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
    .where(isNull(installationComments.deletedAt))
    .orderBy(asc(installationComments.createdAt));

  return rows.map((row) => ({
    ...row.installation_targets,
    campus: row.campuses!,
    building: row.buildings!,
    comments: comments.filter((c) => c.targetId === row.installation_targets.id),
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

export async function getAdminStats(db: DB) {
  const [stationCount, targetCount, contactCount] = await Promise.all([
    db.select().from(stations).then((r) => r.length),
    db.select().from(installationTargets).then((r) => r.length),
    db
      .select()
      .from(emergencyContacts)
      .where(isNull(emergencyContacts.deletedAt))
      .then((r) => r.length),
  ]);
  return { stationCount, targetCount, contactCount };
}

export async function logAuditEvent(
  db: DB,
  action: string,
  targetType: string,
  targetId: string,
) {
  await db.insert(adminAuditEvents).values({
    id: crypto.randomUUID(),
    action,
    targetType,
    targetId,
    createdAt: new Date(),
  });
}
