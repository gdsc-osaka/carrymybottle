import { describe, it, expect, vi, beforeEach } from 'vitest'
import { submitContactAction } from '../actions'
import { insertEmergencyContact, updateAutoReplyError } from '../queries'
import { sendAdminNotificationEmail, sendAutoReplyEmail } from '../mail'

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

  it('自動返信失敗時も success:true を返し updateAutoReplyError を記録する', async () => {
    vi.mocked(sendAutoReplyEmail).mockRejectedValue(new Error('Resend timeout'))

    const formData = new FormData()
    formData.set('stationId', 'station_abc123')
    formData.set('issueType', 'broken')
    formData.set('message', '故障しています')
    formData.set('reporterEmail', 'reporter@example.com')

    const result = await submitContactAction(formData)

    expect(result).toEqual({ success: true })
    expect(vi.mocked(updateAutoReplyError)).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(String),
      expect.stringContaining('Resend timeout')
    )
  })
})
