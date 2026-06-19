/**
 * Rate-limit actions and their thresholds.
 *
 * Targets are defined in DesignDoc §7.3 / §8.3: emergency-contact form
 * submission, installation-request voting, and admin login attempts.
 *
 * Thresholds are intentionally conservative defaults (DesignDoc §16.2 leaves
 * the initial values open). Each can be overridden per environment via the
 * `RATE_LIMIT_*` variables declared in worker-configuration.d.ts.
 */

export type RateLimitAction = 'contact' | 'inquiry' | 'vote' | 'admin_login';

export type RateLimitConfig = {
  /** Maximum allowed requests within the window. */
  max: number;
  /** Window length in seconds. */
  windowSec: number;
};

const DEFAULTS: Record<RateLimitAction, RateLimitConfig> = {
  contact: { max: 5, windowSec: 600 },
  inquiry: { max: 5, windowSec: 600 },
  vote: { max: 20, windowSec: 600 },
  admin_login: { max: 10, windowSec: 600 },
};

type RateLimitEnvKey =
  | 'RATE_LIMIT_CONTACT_MAX'
  | 'RATE_LIMIT_CONTACT_WINDOW_SEC'
  | 'RATE_LIMIT_INQUIRY_MAX'
  | 'RATE_LIMIT_INQUIRY_WINDOW_SEC'
  | 'RATE_LIMIT_VOTE_MAX'
  | 'RATE_LIMIT_VOTE_WINDOW_SEC'
  | 'RATE_LIMIT_ADMIN_LOGIN_MAX'
  | 'RATE_LIMIT_ADMIN_LOGIN_WINDOW_SEC';

const ENV_KEYS: Record<
  RateLimitAction,
  { max: RateLimitEnvKey; window: RateLimitEnvKey }
> = {
  contact: {
    max: 'RATE_LIMIT_CONTACT_MAX',
    window: 'RATE_LIMIT_CONTACT_WINDOW_SEC',
  },
  inquiry: {
    max: 'RATE_LIMIT_INQUIRY_MAX',
    window: 'RATE_LIMIT_INQUIRY_WINDOW_SEC',
  },
  vote: {
    max: 'RATE_LIMIT_VOTE_MAX',
    window: 'RATE_LIMIT_VOTE_WINDOW_SEC',
  },
  admin_login: {
    max: 'RATE_LIMIT_ADMIN_LOGIN_MAX',
    window: 'RATE_LIMIT_ADMIN_LOGIN_WINDOW_SEC',
  },
};

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/** Resolve the effective config for an action, applying env overrides. */
export function resolveRateLimitConfig(
  action: RateLimitAction,
  env: CloudflareEnv
): RateLimitConfig {
  const defaults = DEFAULTS[action];
  const keys = ENV_KEYS[action];
  return {
    max: parsePositiveInt(env[keys.max], defaults.max),
    windowSec: parsePositiveInt(env[keys.window], defaults.windowSec),
  };
}
