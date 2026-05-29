import { campuses } from '../schema';

interface SeedDb {
  insert: (table: unknown) => {
    values: (data: unknown[]) => {
      onConflictDoNothing: () => Promise<void>;
    };
  };
}

// TODO: DBクライアントの型が確定次第、より厳密な型（例: D1Database / LibSQLDatabase 等）に置き換えてください
export async function seedCampuses(db: SeedDb) {
  const now = new Date();
  await db
    .insert(campuses)
    .values([
      {
        id: 'toyonaka',
        name: '豊中',
        mapImagePath: '/images/maps/toyonaka.png',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'suita',
        name: '吹田',
        mapImagePath: '/images/maps/suita.png',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'minoh',
        name: '箕面',
        mapImagePath: '/images/maps/minoh.png',
        createdAt: now,
        updatedAt: now,
      },
    ])
    .onConflictDoNothing();
}
