import { describe, it, expect, vi } from 'vitest';

// events.ts はトップレベルでこれらを import するだけ（呼び出しは trackEvent 内）。
// resolveEnvironment は純粋関数なので、依存はスタブして読み込めれば十分。
vi.mock('@opennextjs/cloudflare', () => ({ getCloudflareContext: vi.fn() }));
vi.mock('@/lib/db/client', () => ({ getDb: vi.fn() }));

import { resolveEnvironment } from '../events';

describe('resolveEnvironment', () => {
  it('APP_ENV 未設定なら development に寄せる', () => {
    expect(resolveEnvironment({})).toBe('development');
  });

  it('APP_ENV が空文字でも development に寄せる（?? ではなく || で揃える）', () => {
    // 記録側と集計側で同じ解決を使うことが目的。空文字で環境がズレないこと。
    expect(resolveEnvironment({ APP_ENV: '' })).toBe('development');
  });

  it('production はそのまま返す', () => {
    expect(resolveEnvironment({ APP_ENV: 'production' })).toBe('production');
  });

  it('development はそのまま返す', () => {
    expect(resolveEnvironment({ APP_ENV: 'development' })).toBe('development');
  });
});
