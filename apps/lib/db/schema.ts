import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const campuses = sqliteTable('campuses', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  mapImagePath: text('map_image_path').notNull(),
  mapWidth: integer('map_width'),
  mapHeight: integer('map_height'),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
  updatedAt: text('updated_at').notNull().default('CURRENT_TIMESTAMP'),
});
