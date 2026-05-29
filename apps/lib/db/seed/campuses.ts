import type { DB } from '../client';
import { campuses } from '../schema';

export async function seedCampuses(db: DB) {
  const now = new Date();
  await db
    .insert(campuses)
    .values([
      {
        id: 'toyonaka',
        name: '豊中',
        mapImagePath: '/maps/toyonaka.png',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'suita',
        name: '吹田',
        mapImagePath: '/maps/suita.png',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'minoh',
        name: '箕面',
        mapImagePath: '/maps/minoh.png',
        createdAt: now,
        updatedAt: now,
      },
    ])
    .onConflictDoNothing();
}
