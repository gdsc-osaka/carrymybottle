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
  await db
    .insert(campuses)
    .values([
      {
        id: 'toyonaka',
        name: '豊中',
        mapImagePath: '/images/maps/toyonaka.png',
      },
      {
        id: 'suita',
        name: '吹田',
        mapImagePath: '/images/maps/suita.png',
      },
      {
        id: 'minoh',
        name: '箕面',
        mapImagePath: '/images/maps/minoh.png',
      },
    ])
    .onConflictDoNothing();
}
