import type { DB } from '@/lib/db/client';
import { buildings } from '../schema';

export async function seedBuildings(db: DB) {
  const now = new Date();
  await db
    .insert(buildings)
    .values([
      // 豊中キャンパス (toyonaka)
      {
        id: 'toyonaka_bldg_01',
        campusId: 'toyonaka',
        name: '全学教育推進機構',
        sortOrder: 10,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'toyonaka_bldg_02',
        campusId: 'toyonaka',
        name: '基礎工学部本館',
        sortOrder: 20,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'toyonaka_bldg_03',
        campusId: 'toyonaka',
        name: '理学部本館',
        sortOrder: 30,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'toyonaka_bldg_04',
        campusId: 'toyonaka',
        name: '総合図書館',
        sortOrder: 40,
        createdAt: now,
        updatedAt: now,
      },

      // 吹田キャンパス (suita)
      {
        id: 'suita_bldg_01',
        campusId: 'suita',
        name: '工学部センタースクエア',
        sortOrder: 10,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'suita_bldg_02',
        campusId: 'suita',
        name: '医学部本館',
        sortOrder: 20,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'suita_bldg_03',
        campusId: 'suita',
        name: '生命科学図書館',
        sortOrder: 30,
        createdAt: now,
        updatedAt: now,
      },

      // 箕面キャンパス (minoh)
      {
        id: 'minoh_bldg_01',
        campusId: 'minoh',
        name: '外国語学部本館',
        sortOrder: 10,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'minoh_bldg_02',
        campusId: 'minoh',
        name: '外国学図書館',
        sortOrder: 20,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'minoh_bldg_03',
        campusId: 'minoh',
        name: '学生交流プラザ',
        sortOrder: 30,
        createdAt: now,
        updatedAt: now,
      },
    ])
    .onConflictDoNothing();
}
