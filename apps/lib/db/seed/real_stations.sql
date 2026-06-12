-- Real water-station seed data (idempotent).
-- Run: wrangler d1 execute DB --remote --file=lib/db/seed/real_stations.sql
-- Timestamps use unix seconds to match Drizzle `mode: 'timestamp'`.
-- All INSERTs use OR IGNORE so re-running is safe (matches onConflictDoNothing).

-- 1. Campuses -----------------------------------------------------------------
INSERT OR IGNORE INTO campuses (id, name, map_image_path, created_at, updated_at)
VALUES
  ('toyonaka', '豊中', '/maps/toyonaka.png', strftime('%s','now'), strftime('%s','now')),
  ('suita',    '吹田', '/maps/suita.png',    strftime('%s','now'), strftime('%s','now'));

-- 2. Buildings ----------------------------------------------------------------
INSERT OR IGNORE INTO buildings (id, campus_id, name, sort_order, created_at, updated_at)
VALUES
  ('toyonaka_bldg_fukuri',    'toyonaka', '福利会館',                   10, strftime('%s','now'), strftime('%s','now')),
  ('toyonaka_bldg_zengaku_a', 'toyonaka', '全学教育推進機構 管理・講義A棟', 20, strftime('%s','now'), strftime('%s','now')),
  ('suita_bldg_coop_honbumae','suita',    '生協コンビニ本部前店',        10, strftime('%s','now'), strftime('%s','now')),
  ('suita_bldg_m3',           'suita',    'M3棟',                       20, strftime('%s','now'), strftime('%s','now'));

-- 3. Stations -----------------------------------------------------------------
-- relative_x / relative_y are placeholders (0.5 area). Adjust later via the
-- admin Visual Coordinate Editor once map positions are confirmed.
INSERT OR IGNORE INTO stations
  (id, campus_id, building_id, name, description, relative_x, relative_y, status, is_public, created_at, updated_at)
VALUES
  ('toyonaka_fukuri_coop', 'toyonaka', 'toyonaka_bldg_fukuri',
   '生協コンビニ',
   '入口入ってすぐ右。コーヒーなどの機械の端。',
   0.40, 0.45, 'available', 1, strftime('%s','now'), strftime('%s','now')),

  ('toyonaka_zengaku_a', 'toyonaka', 'toyonaka_bldg_zengaku_a',
   'ピロティ正面',
   '共通棟ピロティから入って正面。階段近くの壁際。',
   0.55, 0.55, 'available', 1, strftime('%s','now'), strftime('%s','now')),

  ('suita_coop_honbumae', 'suita', 'suita_bldg_coop_honbumae',
   'コンビニ入口',
   '入口入ってすぐ左。お湯の機械の隣。',
   0.45, 0.50, 'available', 1, strftime('%s','now'), strftime('%s','now')),

  ('suita_m3_212', 'suita', 'suita_bldg_m3',
   '212講義室前',
   '理工学図書館から西側のM3棟（工学部棟）の2階。となりのM1棟の2階からもアクセス可。講義室前方右側。',
   0.55, 0.50, 'available', 1, strftime('%s','now'), strftime('%s','now'));

-- 4. Station temperatures -----------------------------------------------------
INSERT OR IGNORE INTO station_temperatures (station_id, temperature_type, created_at)
VALUES
  ('toyonaka_fukuri_coop', 'normal', strftime('%s','now')),
  ('toyonaka_zengaku_a',   'normal', strftime('%s','now')),
  ('suita_coop_honbumae',  'normal', strftime('%s','now')),
  ('suita_m3_212',         'normal', strftime('%s','now')),
  ('suita_m3_212',         'cold',   strftime('%s','now'));
