import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createStationAction } from '../actions'
import { requireAdminSession } from '@/lib/auth/session'

vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn().mockResolvedValue({
    env: { DB: {} },
  }),
}))
vi.mock('@/lib/db/client', () => ({
  getDb: vi.fn().mockReturnValue({}),
}))
vi.mock('@/lib/auth/session', () => ({
  requireAdminSession: vi.fn().mockResolvedValue(undefined),
  createSession: vi.fn(),
  deleteSession: vi.fn(),
}))
vi.mock('../queries', () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
  getAllStations: vi.fn(),
  getStationById: vi.fn(),
}))

describe('createStationAction', () => {
  beforeEach(() => vi.clearAllMocks())

  it('未認証時に requireAdminSession のエラーを伝播する', async () => {
    vi.mocked(requireAdminSession).mockRejectedValue(new Error('NEXT_REDIRECT'))

    const formData = new FormData()

    await expect(createStationAction(formData)).rejects.toThrow('NEXT_REDIRECT')
  })
})
