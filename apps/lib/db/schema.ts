import { sql } from 'drizzle-orm';
import {
  sqliteTable,
  text,
  integer,
  unique,
  index,
} from 'drizzle-orm/sqlite-core';

export const campuses = sqliteTable('campuses', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  mapImagePath: text('map_image_path').notNull(),
  mapWidth: integer('map_width'),
  mapHeight: integer('map_height'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const buildings = sqliteTable(
  'buildings',
  {
    id: text('id').primaryKey(),
    campusId: text('campus_id')
      .notNull()
      .references(() => campuses.id),
    name: text('name').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    unique('buildings_campus_name_idx').on(table.campusId, table.name),
    index('buildings_campus_sort_idx').on(table.campusId, table.sortOrder),
  ]
);
