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
}
