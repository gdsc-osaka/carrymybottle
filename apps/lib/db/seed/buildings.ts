import { buildings } from '../schema';

interface SeedDb {
  insert: (table: unknown) => {
    values: (data: unknown[]) => {
      onConflictDoNothing: () => Promise<void>;
    };
  };
}

// TODO: DBクライアントの型が確定次第、より厳密な型（例: D1Database / LibSQLDatabase 等）に置き換えてください
export async function seedBuildings(db: SeedDb) {
  await db
    .insert(buildings)
    .values([
      // 豊中キャンパス (toyonaka)
      {
        id: 'toyonaka_bldg_01',
        campusId: 'toyonaka',
        name: '全学教育推進機構',
        sortOrder: 10,
      },
      {
        id: 'toyonaka_bldg_02',
        campusId: 'toyonaka',
        name: '基礎工学部本館',
        sortOrder: 20,
      },
      {
        id: 'toyonaka_bldg_03',
        campusId: 'toyonaka',
        name: '理学部本館',
        sortOrder: 30,
      },
      {
        id: 'toyonaka_bldg_04',
        campusId: 'toyonaka',
        name: '総合図書館',
        sortOrder: 40,
      },

      // 吹田キャンパス (suita)
      {
        id: 'suita_bldg_01',
        campusId: 'suita',
        name: '工学部センタースクエア',
        sortOrder: 10,
      },
      {
        id: 'suita_bldg_02',
        campusId: 'suita',
        name: '医学部本館',
        sortOrder: 20,
      },
      {
        id: 'suita_bldg_03',
        campusId: 'suita',
        name: '生命科学図書館',
        sortOrder: 30,
      },

      // 箕面キャンパス (minoh)
      {
        id: 'minoh_bldg_01',
        campusId: 'minoh',
        name: '外国語学部本館',
        sortOrder: 10,
      },
      {
        id: 'minoh_bldg_02',
        campusId: 'minoh',
        name: '外国学図書館',
        sortOrder: 20,
      },
      {
        id: 'minoh_bldg_03',
        campusId: 'minoh',
        name: '学生交流プラザ',
        sortOrder: 30,
      },
    ])
    .onConflictDoNothing();
}
