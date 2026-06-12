import { headers } from 'next/headers';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { sql } from 'drizzle-orm';
import { ok, err, ResultAsync, type Result } from 'neverthrow';
import { getDb, type DB } from '@/lib/db/client';
import { rateLimits } from '@/lib/db/schema';
import {
  resolveRateLimitConfig,
  type RateLimitAction,
  type RateLimitConfig,
} from './config';

export type { RateLimitAction } from './config';

export type RateLimitError =
  | { type: 'RATE_LIMITED'; retryAfterSeconds: number }
  | { type: 'DB_ERROR' };

/** Best-effort client IP. On Cloudflare `cf-connecting-ip` is always set. */
async function getClientIp(): Promise<string> {
  const headerStore = await headers();
  const forwarded = headerStore.get('x-forwarded-for')?.split(',')[0]?.trim();
  return headerStore.get('cf-connecting-ip') ?? forwarded ?? 'unknown';
}

/** SHA-256 hex of the input — keeps raw IPs out of the database. */
async function hashKey(input: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(input)
  );
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Atomically bump the fixed-window counter for `key` and return the resulting
 * count. The window resets in place once it has expired.
 */
function consume(
  db: DB,
  key: string,
  config: RateLimitConfig
): ResultAsync<{ count: number; windowStartMs: number }, RateLimitError> {
  const now = new Date();
  const nowSec = Math.floor(now.getTime() / 1000);
  const thresholdSec = nowSec - config.windowSec;
  const withinWindow = sql`${rateLimits.windowStart} > ${thresholdSec}`;

  return ResultAsync.fromPromise(
    db
      .insert(rateLimits)
      .values({ key, windowStart: now, count: 1, updatedAt: now })
      .onConflictDoUpdate({
        target: rateLimits.key,
        set: {
          count: sql`CASE WHEN ${withinWindow} THEN ${rateLimits.count} + 1 ELSE 1 END`,
          windowStart: sql`CASE WHEN ${withinWindow} THEN ${rateLimits.windowStart} ELSE ${nowSec} END`,
          updatedAt: now,
        },
      })
      .returning({
        count: rateLimits.count,
        windowStart: rateLimits.windowStart,
      }),
    (): RateLimitError => ({ type: 'DB_ERROR' })
  ).andThen((rows) => {
    const row = rows[0];
    if (!row) return err<never, RateLimitError>({ type: 'DB_ERROR' });
    return ok({ count: row.count, windowStartMs: row.windowStart.getTime() });
  });
}

/**
 * Enforce the rate limit for an action against the current request's client.
 *
 * Returns `ok` when the request is within budget. On `RATE_LIMITED` the caller
 * should reject the request. On `DB_ERROR` the caller should fail open
 * (rate-limiting is best-effort and must not block legitimate users).
 */
export async function enforceRateLimit(
  action: RateLimitAction
): Promise<Result<void, RateLimitError>> {
  const contextResult = await ResultAsync.fromPromise(
    getCloudflareContext({ async: true }),
    (): RateLimitError => ({ type: 'DB_ERROR' })
  );
  if (contextResult.isErr()) return err(contextResult.error);

  const { env } = contextResult.value;
  const config = resolveRateLimitConfig(action, env);
  const ip = await getClientIp();
  const key = await hashKey(`${action}:${ip}`);

  const consumed = await consume(getDb(env.DB), key, config);
  return consumed.andThen(({ count, windowStartMs }) => {
    if (count <= config.max) return ok(undefined);
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((windowStartMs + config.windowSec * 1000 - Date.now()) / 1000)
    );
    return err<void, RateLimitError>({
      type: 'RATE_LIMITED',
      retryAfterSeconds,
    });
  });
}
