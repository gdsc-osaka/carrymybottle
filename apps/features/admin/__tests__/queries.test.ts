import { describe, it, expect, vi } from 'vitest'
import { type DB } from '@/lib/db/client'
import { logAuditEvent } from '../queries'

describe('logAuditEvent', () => {
  it('DB insert 失敗でも例外が伝播しない', async () => {
    const mockDb = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockRejectedValue(new Error('D1 DB error')),
      }),
    }

    await expect(
      logAuditEvent(mockDb as unknown as DB, 'delete', 'station', 'station_001')
    ).resolves.toBeUndefined()
  })
})
