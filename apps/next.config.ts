import type { NextConfig } from 'next';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

const nextConfig: NextConfig = {
  /* config options here */
};

// `next dev` 用に Cloudflare バインディング(D1 の DB など)を起動時に一度だけ
// 初期化する。これを呼ばないと getCloudflareContext({ async: true }) が
// リクエストごとに Wrangler/Miniflare プロキシを遅延起動し、Windows 上では
// workerd 子プロセスとの通信が `write EOF` で落ちることがある。
initOpenNextCloudflareForDev();

export default nextConfig;
