import type { NextConfig } from 'next';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Server Action のリクエストボディ上限はデフォルト 1MB。給水機画像
      // （STATION_IMAGE_MAX_BYTES = 5MB / lib/storage/station-images.ts）の
      // アップロードがフォーム検証より手前で弾かれないよう、5MB + 他フォーム
      // 項目の余裕をみて引き上げる。
      bodySizeLimit: '6mb',
    },
  },
};

// `next dev` 用に Cloudflare バインディング(D1 の DB など)を起動時に一度だけ
// 初期化する。これを呼ばないと getCloudflareContext({ async: true }) が
// リクエストごとに Wrangler/Miniflare プロキシを遅延起動し、Windows 上では
// workerd 子プロセスとの通信が `write EOF` で落ちることがある。
initOpenNextCloudflareForDev();

export default nextConfig;
