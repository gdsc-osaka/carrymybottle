/**
 * アップロード画像をブラウザ側で WebP に変換するユーティリティ（#190 関連）。
 *
 * Cloudflare Workers にはネイティブの画像処理（sharp 等）が無いため、変換は
 * クライアント（管理フォーム）で行う。JPEG / PNG を選んでも保存・配信は WebP に
 * なり、最大辺を縮小することで配信サイズとアップロード量を大幅に削減する。
 *
 * 変換できない種別（既に WebP 等）や、何らかの失敗時は元ファイルをそのまま返す
 * （フォールバック）。サーバー側の MIME / サイズ検証は従来どおり通る。
 */

/** WebP へ変換する対象の MIME。既に WebP のものは変換しない。 */
const CONVERTIBLE_MIME_TYPES = new Set(['image/jpeg', 'image/png']);

/** 縮小後の最大辺（px）。これを超える画像は縦横比を保って縮小する。 */
const MAX_EDGE = 1600;

/** WebP エンコード品質（0〜1）。 */
const WEBP_QUALITY = 0.8;

/**
 * 画像 File を WebP（最大辺 {@link MAX_EDGE}px・品質 {@link WEBP_QUALITY}）へ変換する。
 * 変換対象外・失敗時は元の File を返す。
 */
export async function convertImageToWebp(file: File): Promise<File> {
  if (!CONVERTIBLE_MIME_TYPES.has(file.type)) return file;
  // ブラウザ API が無い環境（SSR 等）では何もしない。
  if (
    typeof document === 'undefined' ||
    typeof createImageBitmap === 'undefined'
  )
    return file;

  let bitmap: ImageBitmap | null = null;
  try {
    // EXIF の回転情報を反映する。これを指定しないと、スマホ撮影の縦写真などが
    // canvas 描画で EXIF が剥がれ、変換後の WebP が横向きになることがある。
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/webp', WEBP_QUALITY)
    );
    // 変換に失敗、または元より大きくなった場合は元ファイルを使う。
    if (!blob || blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, '') + '.webp';
    return new File([blob], name, {
      type: 'image/webp',
      lastModified: Date.now(),
    });
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
}
