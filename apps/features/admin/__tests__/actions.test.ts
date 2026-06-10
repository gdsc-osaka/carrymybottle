import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createStationAction, deleteStationAction } from '../actions';
import { requireAdminSession } from '@/lib/auth/session';
import { getDb, type DB } from '@/lib/db/client';
import { logAuditEvent } from '../queries';

vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn().mockResolvedValue({
    env: { DB: {} },
  }),
}));
vi.mock('@/lib/db/client', () => ({
  getDb: vi.fn().mockReturnValue({}),
}));
vi.mock('@/lib/auth/session', () => ({
  requireAdminSession: vi.fn().mockResolvedValue(undefined),
  createSession: vi.fn(),
  deleteSession: vi.fn(),
}));
vi.mock('../queries', () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
  getAllStations: vi.fn(),
  getStationById: vi.fn(),
}));

describe('createStationAction', () => {
  beforeEach(() => vi.clearAllMocks());

  it('未認証時に requireAdminSession のエラーを伝播する', async () => {
    vi.mocked(requireAdminSession).mockRejectedValue(
      new Error('NEXT_REDIRECT')
    );

    const formData = new FormData();

    await expect(createStationAction(formData)).rejects.toThrow(
      'NEXT_REDIRECT'
    );
  });
});

describe('deleteStationAction', () => {
  beforeEach(() => vi.clearAllMocks());

  it('db.transaction を使い emergencyContacts をソフトデリートしてから station を削除し logAuditEvent を実行する', async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(undefined);

    const mockWhere = vi.fn().mockResolvedValue(undefined);
    const mockTx = {
      update: vi
        .fn()
        .mockReturnValue({
          set: vi.fn().mockReturnValue({ where: mockWhere }),
        }),
      delete: vi.fn().mockReturnValue({ where: mockWhere }),
    };
    const mockTransaction = vi
      .fn()
      .mockImplementation(async (cb: (tx: typeof mockTx) => Promise<void>) =>
        cb(mockTx)
      );
    const mockDb = {
      transaction: mockTransaction,
      insert: vi
        .fn()
        .mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
    };
    vi.mocked(getDb).mockReturnValue(mockDb as unknown as DB);

    await deleteStationAction('station_001');

    expect(mockTransaction).toHaveBeenCalled();
    // emergencyContacts の soft delete と stationTemperatures/stations の削除が transaction 内で行われる
    expect(mockTx.update).toHaveBeenCalled();
    expect(mockTx.delete).toHaveBeenCalledTimes(2);
    expect(vi.mocked(logAuditEvent)).toHaveBeenCalledWith(
      mockDb,
      'delete',
      'station',
      'station_001'
    );
  });
});
