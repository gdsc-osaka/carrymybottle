'use server';

import { getCloudflareContext } from '@opennextjs/cloudflare';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getDb } from '@/lib/db/client';
import { stationTemperatures, stations } from '@/lib/db/schema';
import { verifyPassword } from '@/lib/auth/password';
import {
  createSession,
  deleteSession,
  requireAdminSession,
} from '@/lib/auth/session';
import { stationSchema } from './validation';
import {
  getInstallationTargetsWithComments,
  getEmergencyContacts,
  logAuditEvent,
} from './queries';
import { installationComments, emergencyContacts } from '@/lib/db/schema';

async function getEnv() {
  const { env } = await getCloudflareContext({ async: true });
  return env;
}

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// #84 ログイン
export async function loginAction(formData: FormData): Promise<ActionResult> {
  const password = formData.get('password');
  if (typeof password !== 'string' || !password) {
    return { success: false, error: 'パスワードを入力してください' };
  }

  const salt = process.env.ADMIN_PASSWORD_SALT;
  const hash = process.env.ADMIN_PASSWORD_HASH;
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

// #88 給水機追加
export async function createStationAction(
  formData: FormData
): Promise<ActionResult> {
  await requireAdminSession();

  const raw = {
    name: formData.get('name'),
    campusId: formData.get('campusId'),
    buildingId: formData.get('buildingId'),
    status: formData.get('status'),
    temperatures: formData.getAll('temperatures'),
    description: formData.get('description') || undefined,
    relativeX: Number(formData.get('relativeX') ?? 0.5),
    relativeY: Number(formData.get('relativeY') ?? 0.5),
    isPublic: formData.get('isPublic') === 'true',
    shortLinkId: formData.get('shortLinkId') || undefined,
    shortLinkUrl: formData.get('shortLinkUrl') || undefined,
  };

  const result = stationSchema.safeParse(raw);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  const input = result.data;
  const env = await getEnv();
  const db = getDb(env.DB);
  const id = `station_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx.insert(stations).values({
      id,
      campusId: input.campusId,
      buildingId: input.buildingId,
      name: input.name,
      description: input.description,
      relativeX: input.relativeX,
      relativeY: input.relativeY,
      status: input.status,
      isPublic: input.isPublic,
      shortLinkId: input.shortLinkId,
      shortLinkUrl: input.shortLinkUrl || null,
      createdAt: now,
      updatedAt: now,
    });
    await tx.insert(stationTemperatures).values(
      input.temperatures.map((t) => ({
        stationId: id,
        temperatureType: t,
        createdAt: now,
      }))
    );
  });
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

  const raw = {
    name: formData.get('name'),
    campusId: formData.get('campusId'),
    buildingId: formData.get('buildingId'),
    status: formData.get('status'),
    temperatures: formData.getAll('temperatures'),
    description: formData.get('description') || undefined,
    relativeX: Number(formData.get('relativeX') ?? 0.5),
    relativeY: Number(formData.get('relativeY') ?? 0.5),
    isPublic: formData.get('isPublic') === 'true',
    shortLinkId: formData.get('shortLinkId') || undefined,
    shortLinkUrl: formData.get('shortLinkUrl') || undefined,
  };

  const result = stationSchema.safeParse(raw);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  const input = result.data;
  const env = await getEnv();
  const db = getDb(env.DB);
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(stations)
      .set({
        campusId: input.campusId,
        buildingId: input.buildingId,
        name: input.name,
        description: input.description,
        relativeX: input.relativeX,
        relativeY: input.relativeY,
        status: input.status,
        isPublic: input.isPublic,
        shortLinkId: input.shortLinkId,
        shortLinkUrl: input.shortLinkUrl || null,
        updatedAt: now,
      })
      .where(eq(stations.id, stationId));
    await tx
      .delete(stationTemperatures)
      .where(eq(stationTemperatures.stationId, stationId));
    await tx.insert(stationTemperatures).values(
      input.temperatures.map((t) => ({
        stationId,
        temperatureType: t,
        createdAt: now,
      }))
    );
  });
  await logAuditEvent(db, 'update', 'station', stationId);
  revalidatePath('/admin/stations');
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
  await db.transaction(async (tx) => {
    await tx
      .update(emergencyContacts)
      .set({ deletedAt: now })
      .where(eq(emergencyContacts.stationId, stationId));
    await tx
      .delete(stationTemperatures)
      .where(eq(stationTemperatures.stationId, stationId));
    await tx.delete(stations).where(eq(stations.id, stationId));
  });
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

// #93 短縮リンク更新
export async function updateShortLinkAction(
  stationId: string,
  shortLinkId: string,
  shortLinkUrl: string
): Promise<ActionResult> {
  await requireAdminSession();
  const env = await getEnv();
  const db = getDb(env.DB);

  await db
    .update(stations)
    .set({ shortLinkId, shortLinkUrl, updatedAt: new Date() })
    .where(eq(stations.id, stationId));

  await logAuditEvent(db, 'update_short_link', 'station', stationId);
  revalidatePath('/admin/stations');
  return { success: true, data: undefined };
}
