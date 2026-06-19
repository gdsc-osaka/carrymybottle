import { describe, it, expect, vi, beforeEach } from 'vitest';
import { err } from 'neverthrow';
import { submitInquiryAction } from '../actions';
import { insertInquiry } from '../queries';
import { trackEvent } from '@/lib/analytics/events';
import { enforceRateLimit } from '@/lib/rate-limit';

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn().mockResolvedValue({
    env: { DB: {}, APP_ENV: 'test' },
  }),
}));
vi.mock('@/lib/db/client', () => ({
  getDb: vi.fn().mockReturnValue({}),
}));
vi.mock('../queries', () => ({
  insertInquiry: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/analytics/events', () => ({
  trackEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/rate-limit', async () => {
  const { ok } = await import('neverthrow');
  return { enforceRateLimit: vi.fn().mockResolvedValue(ok(undefined)) };
});

function validFormData(): FormData {
  const formData = new FormData();
  formData.set('category', 'general');
  formData.set('name', '山田太郎');
  formData.set('message', 'テストのお問い合わせです');
  formData.set('reporterEmail', 'reporter@example.com');
  return formData;
}

describe('submitInquiryAction', () => {
  beforeEach(() => vi.clearAllMocks());

  it('バリデーション失敗時に DB 未保存でエラーを返す', async () => {
    const formData = new FormData();
    // 全フィールド未入力 — バリデーション失敗を意図的に引き起こす

    const result = await submitInquiryAction(formData);

    expect(result).toMatchObject({ success: false, error: expect.any(String) });
    expect(vi.mocked(insertInquiry)).not.toHaveBeenCalled();
    expect(vi.mocked(trackEvent)).not.toHaveBeenCalled();
  });

  it('不正なメールアドレスはバリデーションで弾かれる', async () => {
    const formData = validFormData();
    formData.set('reporterEmail', 'not-an-email');

    const result = await submitInquiryAction(formData);

    expect(result).toMatchObject({ success: false, error: expect.any(String) });
    expect(vi.mocked(insertInquiry)).not.toHaveBeenCalled();
  });

  it('送信成功時は success:true を返し、保存とイベント記録を行う', async () => {
    const result = await submitInquiryAction(validFormData());

    expect(result).toEqual({ success: true });
    expect(vi.mocked(insertInquiry)).toHaveBeenCalledOnce();
    expect(vi.mocked(trackEvent)).toHaveBeenCalledWith({
      eventName: 'inquiry_submitted',
    });
  });

  it('氏名は任意で、未入力でも送信成功する', async () => {
    const formData = validFormData();
    formData.delete('name');

    const result = await submitInquiryAction(formData);

    expect(result).toEqual({ success: true });
    const [, , input] = vi.mocked(insertInquiry).mock.calls[0]!;
    expect(input.name).toBeUndefined();
  });

  it('レート制限超過時は DB 未保存で失敗を返す', async () => {
    vi.mocked(enforceRateLimit).mockResolvedValueOnce(
      err({ type: 'RATE_LIMITED', retryAfterSeconds: 30 })
    );

    const result = await submitInquiryAction(validFormData());

    expect(result).toMatchObject({ success: false, error: expect.any(String) });
    expect(vi.mocked(insertInquiry)).not.toHaveBeenCalled();
    expect(vi.mocked(trackEvent)).not.toHaveBeenCalled();
  });
});
