'use server';

import { getCloudflareContext } from '@opennextjs/cloudflare';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getDb } from '@/lib/db/client';
import { buildings, stationTemperatures, stations } from '@/lib/db/schema';
import { verifyPassword } from '@/lib/auth/password';
import {
  createSession,
  deleteSession,
  requireAdminSession,
} from '@/lib/auth/session';
import { buildingSchema, stationSchema } from './validation';
import { logAuditEvent } from './queries';
import {
  installationComments,
  emergencyContacts,
  inquiries,
} from '@/lib/db/schema';
import { enforceRateLimit } from '@/lib/rate-limit';

async function getEnv() {
  const { env } = await getCloudflareContext({ async: true });
  return env;
}

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// #84 ログイン
export async function loginAction(formData: FormData): Promise<ActionResult> {
  const rateLimit = await enforceRateLimit('admin_login');
  if (rateLimit.isErr() && rateLimit.error.type === 'RATE_LIMITED') {
    return {
      success: false,
      error: 'ログイン試行が多すぎます。しばらくしてから再度お試しください。',
    };
  }

  const password = formData.get('password');
  if (typeof password !== 'string' || !password) {
    return { success: false, error: 'パスワードを入力してください' };
  }

  const env = await getEnv();
  const salt = env.ADMIN_PASSWORD_SALT;
  const hash = env.ADMIN_PASSWORD_HASH;
  if (!salt || !hash) {
    return { success: false, error: 'サーバー設定エラーが発生しました' };
  }

  const valid = await verifyPassword(password, salt, hash);
  if (!valid) {
    return { success: false, error: 'パスワードが正しくありません' };
  }

  await createSession();
  redirect('/admin');
}

// #94 ログアウト
export async function logoutAction(): Promise<void> {
  await requireAdminSession();
  await deleteSession();
  redirect('/admin/login');
}

// 空欄や非数値は NaN にして Zod に弾かせる（0 などへ暗黙変換させない）。
function parseCoord(value: FormDataEntryValue | null): number {
  if (typeof value !== 'string' || value.trim() === '') return Number.NaN;
  return Number(value);
}

function extractStationFormData(formData: FormData) {
  return {
    name: formData.get('name'),
    campusId: formData.get('campusId'),
    buildingId: formData.get('buildingId'),
    status: formData.get('status'),
    temperatures: formData.getAll('temperatures'),
    description: formData.get('description') || undefined,
    latitude: parseCoord(formData.get('latitude')),
    longitude: parseCoord(formData.get('longitude')),
    isPublic: formData.get('isPublic') === 'true',
    shortLinkId: formData.get('shortLinkId') || undefined,
    shortLinkUrl: formData.get('shortLinkUrl') || undefined,
  };
}

// #88 給水機追加
export async function createStationAction(
  formData: FormData
): Promise<ActionResult> {
  await requireAdminSession();

  const result = stationSchema.safeParse(extractStationFormData(formData));
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  const input = result.data;
  const env = await getEnv();
  const db = getDb(env.DB);
  const id = `station_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
  const now = new Date();

  // D1 は対話的トランザクション(BEGIN/COMMIT)を持たないため、複数文の
  // アトミック実行は db.batch() を使う。
  await db.batch([
    db.insert(stations).values({
      id,
      campusId: input.campusId,
      buildingId: input.buildingId,
      name: input.name,
      description: input.description,
      latitude: input.latitude,
      longitude: input.longitude,
      status: input.status,
      isPublic: input.isPublic,
      shortLinkId: input.shortLinkId,
      shortLinkUrl: input.shortLinkUrl || null,
      createdAt: now,
      updatedAt: now,
    }),
    db.insert(stationTemperatures).values(
      input.temperatures.map((t) => ({
        stationId: id,
        temperatureType: t,
        createdAt: now,
      }))
    ),
  ]);
  await logAuditEvent(db, 'create', 'station', id);
  revalidatePath('/admin/stations');
  return { success: true, data: undefined };
}

// #88 給水機更新
export async function updateStationAction(
  stationId: string,
  formData: FormData
): Promise<ActionResult> {
  await requireAdminSession();

  const result = stationSchema.safeParse(extractStationFormData(formData));
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  const input = result.data;
  const env = await getEnv();
  const db = getDb(env.DB);
  const now = new Date();

  // D1 は対話的トランザクション(BEGIN/COMMIT)を持たないため、複数文の
  // アトミック実行は db.batch() を使う。
  await db.batch([
    db
      .update(stations)
      .set({
        campusId: input.campusId,
        buildingId: input.buildingId,
        name: input.name,
        description: input.description,
        latitude: input.latitude,
        longitude: input.longitude,
        status: input.status,
        isPublic: input.isPublic,
        shortLinkId: input.shortLinkId,
        shortLinkUrl: input.shortLinkUrl || null,
        updatedAt: now,
      })
      .where(eq(stations.id, stationId)),
    db
      .delete(stationTemperatures)
      .where(eq(stationTemperatures.stationId, stationId)),
    db.insert(stationTemperatures).values(
      input.temperatures.map((t) => ({
        stationId,
        temperatureType: t,
        createdAt: now,
      }))
    ),
  ]);
  await logAuditEvent(db, 'update', 'station', stationId);
  revalidatePath('/admin/stations');
  return { success: true, data: undefined };
}

// 建物座標は任意（未設定可）。空欄は null、それ以外は数値化して Zod に委ねる。
function parseNullableCoord(value: FormDataEntryValue | null): number | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  return Number(value);
}

// 空欄や非数値は NaN にして Zod に弾かせる（0 などへ暗黙変換させない）。
function parseIntField(value: FormDataEntryValue | null): number {
  if (typeof value !== 'string' || value.trim() === '') return Number.NaN;
  return Number(value);
}

function extractBuildingFormData(formData: FormData) {
  return {
    name: formData.get('name'),
    sortOrder: parseIntField(formData.get('sortOrder')),
    latitude: parseNullableCoord(formData.get('latitude')),
    longitude: parseNullableCoord(formData.get('longitude')),
  };
}

// #233 建物更新（座標補正）
export async function updateBuildingAction(
  buildingId: string,
  formData: FormData
): Promise<ActionResult> {
  await requireAdminSession();

  const result = buildingSchema.safeParse(extractBuildingFormData(formData));
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  const input = result.data;
  const env = await getEnv();
  const db = getDb(env.DB);

  await db
    .update(buildings)
    .set({
      name: input.name,
      sortOrder: input.sortOrder,
      latitude: input.latitude,
      longitude: input.longitude,
      updatedAt: new Date(),
    })
    .where(eq(buildings.id, buildingId));

  await logAuditEvent(db, 'update', 'building', buildingId);
  revalidatePath('/admin/buildings');
  // 地図の近接抽出は建物座標を使うため、座標更新を /map にも反映させる。
  revalidatePath('/map');
  return { success: true, data: undefined };
}

// #90 給水機非公開化
export async function unpublishStationAction(
  stationId: string
): Promise<ActionResult> {
  await requireAdminSession();
  const env = await getEnv();
  const db = getDb(env.DB);

  await db
    .update(stations)
    .set({ isPublic: false, updatedAt: new Date() })
    .where(eq(stations.id, stationId));

  await logAuditEvent(db, 'unpublish', 'station', stationId);
  revalidatePath('/admin/stations');
  return { success: true, data: undefined };
}

// #90 給水機削除
export async function deleteStationAction(
  stationId: string
): Promise<ActionResult> {
  await requireAdminSession();
  const env = await getEnv();
  const db = getDb(env.DB);

  const now = new Date();
  // D1 は対話的トランザクション(BEGIN/COMMIT)を持たないため、複数文の
  // アトミック実行は db.batch() を使う。
  await db.batch([
    db
      .update(emergencyContacts)
      .set({ deletedAt: now })
      .where(eq(emergencyContacts.stationId, stationId)),
    db
      .delete(stationTemperatures)
      .where(eq(stationTemperatures.stationId, stationId)),
    db.delete(stations).where(eq(stations.id, stationId)),
  ]);
  await logAuditEvent(db, 'delete', 'station', stationId);
  revalidatePath('/admin/stations');
  return { success: true, data: undefined };
}

// #91 コメント削除（論理削除）
export async function deleteInstallationCommentAction(
  commentId: string
): Promise<ActionResult> {
  await requireAdminSession();
  const env = await getEnv();
  const db = getDb(env.DB);

  await db
    .update(installationComments)
    .set({ deletedAt: new Date() })
    .where(eq(installationComments.id, commentId));

  await logAuditEvent(db, 'delete', 'installation_comment', commentId);
  revalidatePath('/admin/requests');
  return { success: true, data: undefined };
}

// #92 緊急連絡削除（論理削除）
export async function deleteEmergencyContactAction(
  contactId: string
): Promise<ActionResult> {
  await requireAdminSession();
  const env = await getEnv();
  const db = getDb(env.DB);

  await db
    .update(emergencyContacts)
    .set({ deletedAt: new Date() })
    .where(eq(emergencyContacts.id, contactId));

  await logAuditEvent(db, 'delete', 'emergency_contact', contactId);
  revalidatePath('/admin/contacts');
  return { success: true, data: undefined };
}

// #205 お問い合わせ削除（論理削除）
export async function deleteInquiryAction(
  inquiryId: string
): Promise<ActionResult> {
  await requireAdminSession();
  const env = await getEnv();
  const db = getDb(env.DB);

  await db
    .update(inquiries)
    .set({ deletedAt: new Date() })
    .where(eq(inquiries.id, inquiryId));

  await logAuditEvent(db, 'delete', 'inquiry', inquiryId);
  revalidatePath('/admin/inquiries');
  return { success: true, data: undefined };
}
