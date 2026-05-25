import { sql } from 'drizzle-orm';
import {
  sqliteTable,
  text,
  integer,
  unique,
  index,
  real,
  check,
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

export const stations = sqliteTable(
  'stations',
  {
    id: text('id').primaryKey(),
    campusId: text('campus_id')
      .notNull()
      .references(() => campuses.id),
    buildingId: text('building_id')
      .notNull()
      .references(() => buildings.id),
    name: text('name').notNull(),
    description: text('description'),
    relativeX: real('relative_x').notNull(),
    relativeY: real('relative_y').notNull(),
    status: text('status').notNull(), // 'available', 'stopped', 'broken'
    shortLinkId: text('short_link_id'),
    shortLinkUrl: text('short_link_url').unique(),
    isPublic: integer('is_public').notNull().default(1),
    createdAt: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    check('stations_relative_x_check', sql`relative_x BETWEEN 0 AND 1`),
    check('stations_relative_y_check', sql`relative_y BETWEEN 0 AND 1`),
    check(
      'stations_status_check',
      sql`status IN ('available', 'stopped', 'broken')`
    ),
  ]
);

export const stationTemperatures = sqliteTable('station_temperatures', {
  stationId: text('station_id')
    .notNull()
    .references(() => stations.id),
  temperatureType: text('temperature_type').notNull(), // 'cold', 'normal', 'hot'
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
