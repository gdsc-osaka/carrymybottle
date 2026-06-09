import { describe, it, expect, vi, beforeEach } from 'vitest'
import { submitContactAction } from '../actions'
import { insertEmergencyContact } from '../queries'
import { sendAdminNotificationEmail } from '../mail'

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn().mockResolvedValue({
    env: { DB: {}, APP_ENV: 'test' },
  }),
}))
vi.mock('@/lib/db/client', () => ({
  getDb: vi.fn().mockReturnValue({}),
}))
vi.mock('../queries', () => ({
  insertEmergencyContact: vi.fn().mockResolvedValue(undefined),
  getStationWithRelations: vi.fn().mockResolvedValue(null),
  updateAutoReplyError: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('../mail', () => ({
  sendAdminNotificationEmail: vi.fn().mockResolvedValue(undefined),
  sendAutoReplyEmail: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/analytics/events', () => ({
  trackEvent: vi.fn().mockResolvedValue(undefined),
}))

describe('submitContactAction', () => {
  beforeEach(() => vi.clearAllMocks())

  it('バリデーション失敗時に DB・メール未呼び出しでエラーを返す', async () => {
    const formData = new FormData()
    // 全フィールド未入力 — バリデーション失敗を意図的に引き起こす

    const result = await submitContactAction(formData)

    expect(result).toMatchObject({ success: false, error: expect.any(String) })
    expect(vi.mocked(insertEmergencyContact)).not.toHaveBeenCalled()
    expect(vi.mocked(sendAdminNotificationEmail)).not.toHaveBeenCalled()
  })
})
