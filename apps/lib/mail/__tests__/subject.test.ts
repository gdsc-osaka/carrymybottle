import { describe, it, expect } from 'vitest';
import { withDevSubjectPrefix } from '../subject';

describe('withDevSubjectPrefix', () => {
  it('production では prefix を付けない', () => {
    expect(withDevSubjectPrefix('お問い合わせ', 'production')).toBe(
      'お問い合わせ'
    );
  });

  it('development では [DEV] を付ける', () => {
    expect(withDevSubjectPrefix('お問い合わせ', 'development')).toBe(
      '[DEV] お問い合わせ'
    );
  });

  it('production 以外（test など）でも [DEV] を付ける', () => {
    expect(withDevSubjectPrefix('お問い合わせ', 'test')).toBe(
      '[DEV] お問い合わせ'
    );
  });
});
