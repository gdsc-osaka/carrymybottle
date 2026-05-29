-- Idempotent seed data for campuses and buildings.
-- Run with: pnpm db:seed:local  (or db:seed:remote for production)

-- Campuses
INSERT INTO campuses (id, name, map_image_path, created_at, updated_at)
VALUES
  ('toyonaka', '豊中', '/maps/toyonaka.png', unixepoch(), unixepoch()),
  ('suita',    '吹田', '/maps/suita.png',    unixepoch(), unixepoch()),
  ('minoh',    '箕面', '/maps/minoh.png',    unixepoch(), unixepoch())
ON CONFLICT (id) DO NOTHING;

-- Buildings: 豊中キャンパス
INSERT INTO buildings (id, campus_id, name, sort_order, created_at, updated_at)
VALUES
  ('toyonaka_bldg_01', 'toyonaka', '全学教育推進機構', 10, unixepoch(), unixepoch()),
  ('toyonaka_bldg_02', 'toyonaka', '基礎工学部本館',   20, unixepoch(), unixepoch()),
  ('toyonaka_bldg_03', 'toyonaka', '理学部本館',       30, unixepoch(), unixepoch()),
  ('toyonaka_bldg_04', 'toyonaka', '総合図書館',       40, unixepoch(), unixepoch())
ON CONFLICT (id) DO NOTHING;

-- Buildings: 吹田キャンパス
INSERT INTO buildings (id, campus_id, name, sort_order, created_at, updated_at)
VALUES
  ('suita_bldg_01', 'suita', '工学部センタースクエア', 10, unixepoch(), unixepoch()),
  ('suita_bldg_02', 'suita', '医学部本館',             20, unixepoch(), unixepoch()),
  ('suita_bldg_03', 'suita', '生命科学図書館',         30, unixepoch(), unixepoch())
ON CONFLICT (id) DO NOTHING;

-- Buildings: 箕面キャンパス
INSERT INTO buildings (id, campus_id, name, sort_order, created_at, updated_at)
VALUES
  ('minoh_bldg_01', 'minoh', '外国語学部本館',   10, unixepoch(), unixepoch()),
  ('minoh_bldg_02', 'minoh', '外国学図書館',     20, unixepoch(), unixepoch()),
  ('minoh_bldg_03', 'minoh', '学生交流プラザ',   30, unixepoch(), unixepoch())
ON CONFLICT (id) DO NOTHING;
