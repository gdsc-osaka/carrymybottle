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
-- latitude / longitude approximate the building location (taken from the station
-- inside each building) and are used to extract nearby buildings from a map tap.
-- Verify against OSM / on the ground before relying on them.
INSERT OR IGNORE INTO buildings (id, campus_id, name, sort_order, latitude, longitude, created_at, updated_at)
VALUES
  ('toyonaka_bldg_fukuri',    'toyonaka', '福利会館',                   10, 34.804468, 135.452892, strftime('%s','now'), strftime('%s','now')),
  -- ピロティ側入り口の給水機が入る建物（OSM 由来。下のステーションの FK 用に冪等投入）。
  ('toyonaka_osm_225710189',  'toyonaka', '共通教育A棟',                 0,  34.806164, 135.454339, strftime('%s','now'), strftime('%s','now')),
  ('suita_bldg_coop_honbumae','suita',    '生協コンビニ本部前店',        10, 34.819203, 135.524713, strftime('%s','now'), strftime('%s','now')),
  ('suita_bldg_m3',           'suita',    'M3棟',                       20, 34.822129, 135.521282, strftime('%s','now'), strftime('%s','now'));

-- 2b. Backfill coordinates for buildings inserted before the latitude/longitude
-- columns existed (INSERT OR IGNORE above is a no-op for existing ids). Safe to
-- re-run: the UPDATE simply re-sets the same values.
UPDATE buildings SET latitude = 34.804468, longitude = 135.452892 WHERE id = 'toyonaka_bldg_fukuri';
UPDATE buildings SET latitude = 34.819203, longitude = 135.524713 WHERE id = 'suita_bldg_coop_honbumae';
UPDATE buildings SET latitude = 34.822129, longitude = 135.521282 WHERE id = 'suita_bldg_m3';

-- 3. Stations -----------------------------------------------------------------
-- latitude / longitude are approximate and MUST be verified against OSM / on the
-- ground before relying on them. relative_x / relative_y are legacy (unused by the
-- MapLibre vector map) and kept only to satisfy NOT NULL defaults.
INSERT OR IGNORE INTO stations
  (id, campus_id, building_id, name, description, latitude, longitude, relative_x, relative_y, status, is_public, created_at, updated_at)
VALUES
  ('toyonaka_fukuri_coop', 'toyonaka', 'toyonaka_bldg_fukuri',
   '生協コンビニ',
   '入口入ってすぐ右。コーヒーなどの機械の端。',
   34.8036, 135.4554, 0.40, 0.45, 'available', 1, strftime('%s','now'), strftime('%s','now')),

  ('toyonaka_zengaku_a', 'toyonaka', 'toyonaka_osm_225710189',
   'ピロティ側入り口',
   '共通棟ピロティから入って正面。階段近くの壁際。',
   34.806029, 135.454468, 0.55, 0.55, 'available', 1, strftime('%s','now'), strftime('%s','now')),

  ('suita_coop_honbumae', 'suita', 'suita_bldg_coop_honbumae',
   'コンビニ入口',
   '入口入ってすぐ左。お湯の機械の隣。',
   34.8224, 135.5246, 0.45, 0.50, 'available', 1, strftime('%s','now'), strftime('%s','now')),

  ('suita_m3_212', 'suita', 'suita_bldg_m3',
   '212講義室前',
   '理工学図書館から西側のM3棟（工学部棟）の2階。となりのM1棟の2階からもアクセス可。講義室前方右側。',
   34.8208, 135.5230, 0.55, 0.50, 'available', 1, strftime('%s','now'), strftime('%s','now'));

-- 3b. Backfill coordinates for rows inserted before the latitude/longitude
-- columns existed (INSERT OR IGNORE above is a no-op for existing ids). Safe to
-- re-run: the UPDATE simply re-sets the same values.
UPDATE stations SET latitude = 34.8036, longitude = 135.4554 WHERE id = 'toyonaka_fukuri_coop';
-- 給水機を共通教育A棟へ移設し名称も変更済み。既存行にも収束させる。
UPDATE stations SET building_id = 'toyonaka_osm_225710189', name = 'ピロティ側入り口', latitude = 34.806029, longitude = 135.454468 WHERE id = 'toyonaka_zengaku_a';
UPDATE stations SET latitude = 34.8224, longitude = 135.5246 WHERE id = 'suita_coop_honbumae';
UPDATE stations SET latitude = 34.8208, longitude = 135.5230 WHERE id = 'suita_m3_212';

-- 4. Station temperatures -----------------------------------------------------
INSERT OR IGNORE INTO station_temperatures (station_id, temperature_type, created_at)
VALUES
  ('toyonaka_fukuri_coop', 'normal', strftime('%s','now')),
  ('toyonaka_zengaku_a',   'normal', strftime('%s','now')),
  ('suita_coop_honbumae',  'normal', strftime('%s','now')),
  ('suita_m3_212',         'normal', strftime('%s','now')),
  ('suita_m3_212',         'cold',   strftime('%s','now'));

-- 5. 不要になった建物の削除 ---------------------------------------------------
-- 「全学教育推進機構 管理・講義A棟」(toyonaka_bldg_zengaku_a) は給水機を共通教育A棟へ
-- 移したため不要。設置希望の投票データ（票・コメント・ターゲット）を先に掃除してから
-- 建物行を削除する。冪等（既に無ければ no-op）。
DELETE FROM installation_votes WHERE target_id IN (SELECT id FROM installation_targets WHERE building_id = 'toyonaka_bldg_zengaku_a');
DELETE FROM installation_comments WHERE target_id IN (SELECT id FROM installation_targets WHERE building_id = 'toyonaka_bldg_zengaku_a');
DELETE FROM installation_targets WHERE building_id = 'toyonaka_bldg_zengaku_a';
DELETE FROM buildings WHERE id = 'toyonaka_bldg_zengaku_a';
