import {
  foreignKey,
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

export const campuses = sqliteTable('campuses', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  mapImagePath: text('map_image_path').notNull(),
  mapWidth: integer('map_width'),
  mapHeight: integer('map_height'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
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
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [
    uniqueIndex('buildings_campus_name_idx').on(t.campusId, t.name),
    uniqueIndex('buildings_id_campus_idx').on(t.id, t.campusId),
  ]
);

export const stations = sqliteTable(
  'stations',
  {
    id: text('id').primaryKey(),
    campusId: text('campus_id').notNull(),
    buildingId: text('building_id').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    // 地図上の絶対座標（緯度・経度）。MapLibre のベクトルタイル地図でピンを表示する。
    // 旧 relativeX/relativeY（PNG 地図上の相対座標）はベクトル地図移行に伴い未使用。
    latitude: real('latitude'),
    longitude: real('longitude'),
    relativeX: real('relative_x').notNull().default(0.5),
    relativeY: real('relative_y').notNull().default(0.5),
    status: text('status', { enum: ['available', 'stopped', 'broken'] })
      .notNull()
      .default('available'),
    shortLinkId: text('short_link_id'),
    shortLinkUrl: text('short_link_url'),
    isPublic: integer('is_public', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.buildingId, t.campusId],
      foreignColumns: [buildings.id, buildings.campusId],
    }),
  ]
);

export const stationTemperatures = sqliteTable(
  'station_temperatures',
  {
    stationId: text('station_id')
      .notNull()
      .references(() => stations.id),
    temperatureType: text('temperature_type', {
      enum: ['cold', 'normal', 'hot'],
    }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.stationId, t.temperatureType] })]
);

export const installationTargets = sqliteTable(
  'installation_targets',
  {
    id: text('id').primaryKey(),
    campusId: text('campus_id').notNull(),
    buildingId: text('building_id').notNull(),
    voteCount: integer('vote_count').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [
    uniqueIndex('installation_targets_campus_building_idx').on(
      t.campusId,
      t.buildingId
    ),
    foreignKey({
      columns: [t.buildingId, t.campusId],
      foreignColumns: [buildings.id, buildings.campusId],
    }),
  ]
);

export const installationVotes = sqliteTable('installation_votes', {
  id: text('id').primaryKey(),
  targetId: text('target_id')
    .notNull()
    .references(() => installationTargets.id),
  voterTokenHash: text('voter_token_hash').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const installationComments = sqliteTable(
  'installation_comments',
  {
    id: text('id').primaryKey(),
    targetId: text('target_id')
      .notNull()
      .references(() => installationTargets.id),
    comment: text('comment').notNull(),
    voterTokenHash: text('voter_token_hash'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  },
  (t) => [
    index('installation_comments_target_token_created_idx').on(
      t.targetId,
      t.voterTokenHash,
      t.createdAt
    ),
  ]
);

export const emergencyContacts = sqliteTable('emergency_contacts', {
  id: text('id').primaryKey(),
  stationId: text('station_id')
    .notNull()
    .references(() => stations.id),
  issueType: text('issue_type', {
    enum: ['broken', 'stopped', 'no_water', 'leak_or_abnormal', 'other'],
  }).notNull(),
  message: text('message').notNull(),
  reporterEmail: text('reporter_email').notNull(),
  adminEmailSentAt: integer('admin_email_sent_at', { mode: 'timestamp' }),
  autoReplySentAt: integer('auto_reply_sent_at', { mode: 'timestamp' }),
  autoReplyError: text('auto_reply_error'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
});

export const analyticsEvents = sqliteTable('analytics_events', {
  id: text('id').primaryKey(),
  eventName: text('event_name').notNull(),
  stationId: text('station_id'),
  campusId: text('campus_id'),
  buildingId: text('building_id'),
  source: text('source'),
  metadataJson: text('metadata_json'),
  environment: text('environment').notNull().default('development'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const adminAuditEvents = sqliteTable('admin_audit_events', {
  id: text('id').primaryKey(),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Fixed-window rate limiting. One row per (action + identifier) hash; the
// window resets in place once it expires, so the table stays bounded.
export const rateLimits = sqliteTable('rate_limits', {
  key: text('key').primaryKey(),
  windowStart: integer('window_start', { mode: 'timestamp' }).notNull(),
  count: integer('count').notNull().default(0),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});
