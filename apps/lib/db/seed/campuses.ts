import { campuses } from '../schema';

// TODO: DBクライアントの型が確定次第、any を適切な型（例: D1Database / LibSQLDatabase 等）に置き換えてください
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function seedCampuses(db: any) {
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
