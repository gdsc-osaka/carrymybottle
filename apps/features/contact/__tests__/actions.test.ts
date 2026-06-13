import { describe, it, expect, vi, beforeEach } from 'vitest';
import { err } from 'neverthrow';
import { submitContactAction } from '../actions';
import { insertEmergencyContact, updateAutoReplyError } from '../queries';
import { sendAdminNotificationEmail, sendAutoReplyEmail } from '../mail';
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
  insertEmergencyContact: vi.fn().mockResolvedValue(undefined),
  getStationWithRelations: vi.fn().mockResolvedValue(null),
  updateAutoReplyError: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../mail', () => ({
  sendAdminNotificationEmail: vi.fn().mockResolvedValue(undefined),
  sendAutoReplyEmail: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/analytics/events', () => ({
  trackEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/rate-limit', async () => {
  const { ok } = await import('neverthrow');
  return { enforceRateLimit: vi.fn().mockResolvedValue(ok(undefined)) };
});

describe('submitContactAction', () => {
  beforeEach(() => vi.clearAllMocks());

  it('バリデーション失敗時に DB・メール未呼び出しでエラーを返す', async () => {
    const formData = new FormData();
    // 全フィールド未入力 — バリデーション失敗を意図的に引き起こす

    const result = await submitContactAction(formData);

    expect(result).toMatchObject({ success: false, error: expect.any(String) });
    expect(vi.mocked(insertEmergencyContact)).not.toHaveBeenCalled();
    expect(vi.mocked(sendAdminNotificationEmail)).not.toHaveBeenCalled();
  });

  it('自動返信失敗時も success:true を返し updateAutoReplyError を記録する', async () => {
    vi.mocked(sendAutoReplyEmail).mockRejectedValue(
      new Error('Resend timeout')
    );

    const formData = new FormData();
    formData.set('stationId', 'station_abc123');
    formData.set('issueType', 'broken');
    formData.set('message', '故障しています');
    formData.set('reporterEmail', 'reporter@example.com');

    const result = await submitContactAction(formData);

    expect(result).toEqual({ success: true });
    expect(vi.mocked(updateAutoReplyError)).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(String),
      expect.stringContaining('Resend timeout')
    );
  });

  it('管理者通知失敗時は success:false を返し、自動返信を呼ばない', async () => {
    vi.mocked(sendAdminNotificationEmail).mockRejectedValue(
      new Error('domain is not verified')
    );

    const formData = new FormData();
    formData.set('stationId', 'station_abc123');
    formData.set('issueType', 'broken');
    formData.set('message', '故障しています');
    formData.set('reporterEmail', 'reporter@example.com');

    const result = await submitContactAction(formData);

    expect(result).toMatchObject({ success: false, error: expect.any(String) });
    expect(vi.mocked(sendAutoReplyEmail)).not.toHaveBeenCalled();
  });

  it('レート制限超過時は DB・メール未呼び出しで失敗を返す', async () => {
    vi.mocked(enforceRateLimit).mockResolvedValueOnce(
      err({ type: 'RATE_LIMITED', retryAfterSeconds: 30 })
    );

    const formData = new FormData();
    formData.set('stationId', 'station_abc123');
    formData.set('issueType', 'broken');
    formData.set('message', '故障しています');
    formData.set('reporterEmail', 'reporter@example.com');

    const result = await submitContactAction(formData);

    expect(result).toMatchObject({ success: false, error: expect.any(String) });
    expect(vi.mocked(insertEmergencyContact)).not.toHaveBeenCalled();
    expect(vi.mocked(sendAdminNotificationEmail)).not.toHaveBeenCalled();
  });
});
