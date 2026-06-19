/**
 * アップロード画像をブラウザ側で WebP へ変換し、最終的な寸法を取得するユーティリティ
 * （#190 関連）。
 *
 * Cloudflare Workers にはネイティブの画像処理（sharp 等）が無いため、変換は
 * クライアント（管理フォーム）で行う。JPEG / PNG を選んでも保存・配信は WebP に
 * なり、最大辺を縮小することで配信サイズとアップロード量を大幅に削減する。
 *
 * 併せて、アップロードする画像の寸法（px）も返す。詳細ページでこの寸法から
 * aspect-ratio 枠を確保し、画像ロード時のレイアウトシフト（CLS）を防ぐ。
 *
 * 変換できない種別（既に WebP 等）や失敗時は元ファイルを返す（フォールバック）。
 * 寸法が取得できない場合は width/height を null にする。サーバー側の MIME /
 * サイズ検証は従来どおり通る。
 */

/** WebP へ変換する対象の MIME。既に WebP のものは変換しない。 */
const CONVERTIBLE_MIME_TYPES = new Set(['image/jpeg', 'image/png']);

/** 縮小後の最大辺（px）。これを超える画像は縦横比を保って縮小する。 */
const MAX_EDGE = 1600;

/** WebP エンコード品質（0〜1）。 */
const WEBP_QUALITY = 0.8;

export type ProcessedImage = {
  /** アップロードする File（変換できた場合は WebP、できなければ元ファイル）。 */
  file: File;
  /** 最終的な画像の幅（px）。取得できなければ null。 */
  width: number | null;
  /** 最終的な画像の高さ（px）。取得できなければ null。 */
  height: number | null;
};

/**
 * 画像 File を WebP（最大辺 {@link MAX_EDGE}px・品質 {@link WEBP_QUALITY}）へ変換し、
 * アップロード用の File と寸法を返す。変換対象外・失敗時は元 File を返す。
 */
export async function processImageForUpload(
  file: File
): Promise<ProcessedImage> {
  // ブラウザ API が無い環境（SSR 等）では何もしない。
  if (
    typeof document === 'undefined' ||
    typeof createImageBitmap === 'undefined'
  ) {
    return { file, width: null, height: null };
  }

  let bitmap: ImageBitmap | null = null;
  try {
    // EXIF の回転情報を反映する。これを指定しないと、スマホ撮影の縦写真などが
    // canvas 描画で EXIF が剥がれ、変換後の WebP が横向きになることがある。
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const srcWidth = bitmap.width;
    const srcHeight = bitmap.height;

    // 変換対象外（既に WebP 等）はそのまま。寸法のみ返す。
    if (!CONVERTIBLE_MIME_TYPES.has(file.type)) {
      return { file, width: srcWidth, height: srcHeight };
    }

    const scale = Math.min(1, MAX_EDGE / Math.max(srcWidth, srcHeight));
    const width = Math.max(1, Math.round(srcWidth * scale));
    const height = Math.max(1, Math.round(srcHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { file, width: srcWidth, height: srcHeight };
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/webp', WEBP_QUALITY)
    );
    // 変換に失敗、または元より大きくなった場合は元ファイル（寸法は元のまま）。
    if (!blob || blob.size >= file.size) {
      return { file, width: srcWidth, height: srcHeight };
    }

    const name = file.name.replace(/\.[^.]+$/, '') + '.webp';
    const webpFile = new File([blob], name, {
      type: 'image/webp',
      lastModified: Date.now(),
    });
    return { file: webpFile, width, height };
  } catch {
    return { file, width: null, height: null };
  } finally {
    bitmap?.close();
  }
}
