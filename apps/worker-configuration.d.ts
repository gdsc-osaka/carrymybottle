/// <reference types="@cloudflare/workers-types" />

interface CloudflareEnv {
  DB: D1Database;
  APP_ENV: string;
  APP_BASE_URL: string;
  ADMIN_PASSWORD_HASH: string;
  ADMIN_PASSWORD_SALT: string;
  SESSION_SECRET: string;
  RESEND_API_KEY: string;
  EMERGENCY_CONTACT_TO: string;
  EMERGENCY_CONTACT_FROM: string;
  VOTE_TOKEN_SECRET: string;
  // 給水機写真の保存（R2 バインディング）と公開配信ベースURL（#190）。
  STATION_IMAGES: R2Bucket;
  IMAGE_PUBLIC_BASE_URL: string;
  // Optional rate-limit overrides. When unset, the defaults in
  // lib/rate-limit/config.ts apply.
  RATE_LIMIT_CONTACT_MAX?: string;
  RATE_LIMIT_CONTACT_WINDOW_SEC?: string;
  RATE_LIMIT_INQUIRY_MAX?: string;
  RATE_LIMIT_INQUIRY_WINDOW_SEC?: string;
  RATE_LIMIT_VOTE_MAX?: string;
  RATE_LIMIT_VOTE_WINDOW_SEC?: string;
  RATE_LIMIT_ADMIN_LOGIN_MAX?: string;
  RATE_LIMIT_ADMIN_LOGIN_WINDOW_SEC?: string;
}
