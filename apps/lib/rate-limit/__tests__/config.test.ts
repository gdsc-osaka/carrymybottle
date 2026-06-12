import { describe, it, expect } from 'vitest';
import { resolveRateLimitConfig } from '../config';

function env(overrides: Partial<CloudflareEnv>): CloudflareEnv {
  return overrides as CloudflareEnv;
}

describe('resolveRateLimitConfig', () => {
  it('上書きが無い場合はデフォルト値を返す', () => {
    expect(resolveRateLimitConfig('contact', env({}))).toEqual({
      max: 5,
      windowSec: 600,
    });
    expect(resolveRateLimitConfig('vote', env({}))).toEqual({
      max: 20,
      windowSec: 600,
    });
    expect(resolveRateLimitConfig('admin_login', env({}))).toEqual({
      max: 10,
      windowSec: 600,
    });
  });

  it('環境変数で閾値を上書きできる', () => {
    const result = resolveRateLimitConfig(
      'contact',
      env({ RATE_LIMIT_CONTACT_MAX: '2', RATE_LIMIT_CONTACT_WINDOW_SEC: '30' })
    );
    expect(result).toEqual({ max: 2, windowSec: 30 });
  });

  it('不正な値（0・負数・非数値）はデフォルトにフォールバックする', () => {
    expect(
      resolveRateLimitConfig(
        'vote',
        env({ RATE_LIMIT_VOTE_MAX: '0', RATE_LIMIT_VOTE_WINDOW_SEC: 'abc' })
      )
    ).toEqual({ max: 20, windowSec: 600 });
    expect(
      resolveRateLimitConfig('vote', env({ RATE_LIMIT_VOTE_MAX: '-5' }))
    ).toEqual({ max: 20, windowSec: 600 });
  });
});
