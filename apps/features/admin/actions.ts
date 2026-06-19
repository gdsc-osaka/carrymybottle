'use server';

import { getCloudflareContext } from '@opennextjs/cloudflare';
import { count, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getDb } from '@/lib/db/client';
import {
  buildings,
  stationTemperatures,
  stations,
  installationTargets,
} from '@/lib/db/schema';
import { verifyPassword } from '@/lib/auth/password';
import {
  createSession,
  deleteSession,
  requireAdminSession,
} from '@/lib/auth/session';
import { buildingSchema, stationSchema } from './validation';
import { logAuditEvent, getStationImageKey } from './queries';
import {
  uploadStationImage,
  deleteStationImage,
  validateStationImage,
} from '@/lib/storage/station-images';
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

/** フォームの画像ファイルを取り出す。未選択（空ファイル）なら null。 */
function extractImageFile(formData: FormData): File | null {
  const value = formData.get('image');
  if (value instanceof File && value.size > 0) return value;
  return null;
}

// クライアントが付与する画像寸法（px）。詳細ページの aspect-ratio 枠に使う。
// 不正・未送信は null（フォールバック）。
function extractImageDimensions(formData: FormData): {
  width: number | null;
  height: number | null;
} {
  const w = Number(formData.get('imageWidth'));
  const h = Number(formData.get('imageHeight'));
  return {
    width: Number.isInteger(w) && w > 0 ? w : null,
    height: Number.isInteger(h) && h > 0 ? h : null,
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

  // 画像は任意。選択時のみ検証し、R2 へアップロードしてキーと寸法を保存する。
  const imageFile = extractImageFile(formData);
  let imageKey: string | null = null;
  let imageWidth: number | null = null;
  let imageHeight: number | null = null;
  if (imageFile) {
    const imageError = validateStationImage(imageFile);
    if (imageError) return { success: false, error: imageError };
    imageKey = await uploadStationImage(env.STATION_IMAGES, id, imageFile);
    const dimensions = extractImageDimensions(formData);
    imageWidth = dimensions.width;
    imageHeight = dimensions.height;
  }

  // D1 は対話的トランザクション(BEGIN/COMMIT)を持たないため、複数文の
  // アトミック実行は db.batch() を使う。
  try {
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
        imageKey,
        imageWidth,
        imageHeight,
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
  } catch (e) {
    // insert 失敗時はアップロード済みオブジェクトを補償削除し、孤児を残さない
    // （update/delete と対称にする）。削除失敗は握りつぶし、元の例外を伝播する。
    if (imageKey) {
      await deleteStationImage(env.STATION_IMAGES, imageKey).catch(() => {});
    }
    throw e;
  }
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

  // 画像の差し替え / 削除 / 据え置きを判定する。
  // - removeImage=true: 画像を外す（旧オブジェクトは削除）
  // - 新しいファイルあり: 差し替え（アップロード後、旧オブジェクトは削除）
  // - いずれもなし: 現状維持（imageKey は変更しない）
  const currentImageKey = await getStationImageKey(db, stationId);
  const removeImage = formData.get('removeImage') === 'true';
  const imageFile = extractImageFile(formData);

  // 画像に変更があるときだけ image 系カラム（キー＋寸法）を更新する。据え置き時は
  // undefined のままにして現状の値を保持する。
  let imageFields:
    | {
        imageKey: string | null;
        imageWidth: number | null;
        imageHeight: number | null;
      }
    | undefined;
  let imageKeyToDelete: string | null = null;
  if (removeImage) {
    imageFields = { imageKey: null, imageWidth: null, imageHeight: null };
    imageKeyToDelete = currentImageKey;
  } else if (imageFile) {
    const imageError = validateStationImage(imageFile);
    if (imageError) return { success: false, error: imageError };
    const newImageKey = await uploadStationImage(
      env.STATION_IMAGES,
      stationId,
      imageFile
    );
    const dimensions = extractImageDimensions(formData);
    imageFields = {
      imageKey: newImageKey,
      imageWidth: dimensions.width,
      imageHeight: dimensions.height,
    };
    imageKeyToDelete = currentImageKey;
  }

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
        ...imageFields,
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

  // DB 更新成功後に旧オブジェクトを削除（孤児を残さない）。失敗は致命的でない。
  if (imageKeyToDelete && imageKeyToDelete !== imageFields?.imageKey) {
    await deleteStationImage(env.STATION_IMAGES, imageKeyToDelete).catch(
      () => {}
    );
  }

  await logAuditEvent(db, 'update', 'station', stationId);
  revalidatePath('/admin/stations');
  return { success: true, data: undefined };
}

// 建物座標は任意（未設定可）。空欄は null、それ以外は数値化して Zod に委ねる。
function parseNullableCoord(value: FormDataEntryValue | null): number | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  return Number(value);
}

function extractBuildingFormData(formData: FormData) {
  return {
    name: formData.get('name'),
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

// 建物削除（物理削除）。給水機・設置希望から参照されている場合は不整合を避けるため
// 削除を拒否する（D1 の FK 強制に依存せず、明示的に依存をチェックする）。
export async function deleteBuildingAction(
  buildingId: string
): Promise<ActionResult> {
  await requireAdminSession();
  const env = await getEnv();
  const db = getDb(env.DB);

  const [stationRows, targetRows] = await Promise.all([
    db
      .select({ count: count() })
      .from(stations)
      .where(eq(stations.buildingId, buildingId)),
    db
      .select({ count: count() })
      .from(installationTargets)
      .where(eq(installationTargets.buildingId, buildingId)),
  ]);
  const dependentStations = stationRows[0].count;
  const dependentTargets = targetRows[0].count;
  if (dependentStations > 0 || dependentTargets > 0) {
    return {
      success: false,
      error: `この建物は給水機 ${dependentStations} 件・設置希望 ${dependentTargets} 件から参照されているため削除できません。先にそれらを削除してください。`,
    };
  }

  await db.delete(buildings).where(eq(buildings.id, buildingId));

  await logAuditEvent(db, 'delete', 'building', buildingId);
  revalidatePath('/admin/buildings');
  // 地図の近接抽出は建物座標を使うため、削除を /map にも反映させる。
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

  // 削除対象の画像キーを先に取得しておく（行削除後は参照できないため）。
  const imageKey = await getStationImageKey(db, stationId);

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

  // DB 削除成功後に R2 オブジェクトを削除（孤児を残さない）。失敗は致命的でない。
  if (imageKey) {
    await deleteStationImage(env.STATION_IMAGES, imageKey).catch(() => {});
  }

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
