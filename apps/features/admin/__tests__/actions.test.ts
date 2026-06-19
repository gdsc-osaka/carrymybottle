import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createStationAction,
  deleteStationAction,
  deleteInquiryAction,
} from '../actions';
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

  it('db.batch で emergencyContacts をソフトデリートしてから station を削除し logAuditEvent を実行する', async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(undefined);

    // D1 は対話的トランザクションを持たないため、実装は db.batch([...]) で
    // 複数文をまとめて実行する。各ステートメントビルダー(update/delete)は
    // batch に渡す配列の要素として評価される。
    const mockStatement = {};
    const mockWhere = vi.fn().mockReturnValue(mockStatement);
    const mockUpdate = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({ where: mockWhere }),
    });
    const mockDelete = vi.fn().mockReturnValue({ where: mockWhere });
    const mockBatch = vi.fn().mockResolvedValue(undefined);
    const mockDb = {
      update: mockUpdate,
      delete: mockDelete,
      batch: mockBatch,
    };
    vi.mocked(getDb).mockReturnValue(mockDb as unknown as DB);

    await deleteStationAction('station_001');

    expect(mockBatch).toHaveBeenCalled();
    // emergencyContacts の soft delete(update) と
    // stationTemperatures/stations の削除(delete×2)が batch 内で行われる
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockDelete).toHaveBeenCalledTimes(2);
    expect(vi.mocked(logAuditEvent)).toHaveBeenCalledWith(
      mockDb,
      'delete',
      'station',
      'station_001'
    );
  });
});

describe('deleteInquiryAction', () => {
  beforeEach(() => vi.clearAllMocks());

  it('未認証時に requireAdminSession のエラーを伝播する', async () => {
    vi.mocked(requireAdminSession).mockRejectedValue(
      new Error('NEXT_REDIRECT')
    );

    await expect(deleteInquiryAction('inquiry_001')).rejects.toThrow(
      'NEXT_REDIRECT'
    );
  });

  it('inquiries をソフトデリートして logAuditEvent を実行する', async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(undefined);

    const mockWhere = vi.fn().mockResolvedValue(undefined);
    const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
    const mockUpdate = vi.fn().mockReturnValue({ set: mockSet });
    const mockDb = { update: mockUpdate };
    vi.mocked(getDb).mockReturnValue(mockDb as unknown as DB);

    const result = await deleteInquiryAction('inquiry_001');

    expect(mockUpdate).toHaveBeenCalled();
    // 物理削除ではなく deletedAt のセット（論理削除）であること
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ deletedAt: expect.any(Date) })
    );
    expect(vi.mocked(logAuditEvent)).toHaveBeenCalledWith(
      mockDb,
      'delete',
      'inquiry',
      'inquiry_001'
    );
    expect(result).toEqual({ success: true, data: undefined });
  });
});
