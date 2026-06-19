/**
 * 給水機写真の R2 保存・配信ヘルパー（#190）。
 *
 * 書き込み（PUT/DELETE）は Worker の R2 バインディング `STATION_IMAGES` 経由。
 * 読み取りは公開バケット + カスタムドメイン（prod）/ r2.dev（dev）の直リンクで、
 * Worker を経由しない。URL は `IMAGE_PUBLIC_BASE_URL` + オブジェクトキーで組み立てる。
 */
import { z } from 'zod';

/** アップロードを許可する MIME タイプ。 */
export const STATION_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type StationImageMimeType = (typeof STATION_IMAGE_MIME_TYPES)[number];

/** 画像サイズの上限（5MB）。 */
export const STATION_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

const MIME_TO_EXTENSION: Record<StationImageMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function isStationImageMimeType(type: string): type is StationImageMimeType {
  return (STATION_IMAGE_MIME_TYPES as readonly string[]).includes(type);
}

/**
 * アップロード画像の Zod スキーマ（MIME・サイズを Server Action 境界で検証する。
 * AGENTS.md §9 / #190）。空ファイル（未選択）は呼び出し側で除外する想定。
 */
export const stationImageSchema = z
  .instanceof(File)
  .refine(
    (file) => isStationImageMimeType(file.type),
    'JPEG / PNG / WebP のいずれかの画像を選択してください'
  )
  .refine(
    (file) => file.size <= STATION_IMAGE_MAX_BYTES,
    '画像サイズは5MB以内にしてください'
  );

/**
 * 画像ファイルを検証する。問題があればエラーメッセージ、なければ null を返す。
 */
export function validateStationImage(file: File): string | null {
  const result = stationImageSchema.safeParse(file);
  return result.success ? null : result.error.issues[0].message;
}

/** 給水機写真の R2 オブジェクトキーを生成する。 */
export function buildStationImageKey(stationId: string, file: File): string {
  const ext = isStationImageMimeType(file.type)
    ? MIME_TO_EXTENSION[file.type]
    : 'bin';
  return `stations/${stationId}/${crypto.randomUUID()}.${ext}`;
}

/** 画像を R2 にアップロードし、保存したオブジェクトキーを返す。 */
export async function uploadStationImage(
  bucket: R2Bucket,
  stationId: string,
  file: File
): Promise<string> {
  const key = buildStationImageKey(stationId, file);
  await bucket.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  });
  return key;
}

/** R2 から画像を削除する。 */
export async function deleteStationImage(
  bucket: R2Bucket,
  key: string
): Promise<void> {
  await bucket.delete(key);
}

/**
 * 公開配信URLを組み立てる。ベースURL未設定 or キー未登録なら null（フォールバック）。
 */
export function stationImageUrl(
  baseUrl: string | undefined,
  key: string | null | undefined
): string | null {
  if (!baseUrl || !key) return null;
  return `${baseUrl.replace(/\/+$/, '')}/${key}`;
}
