/**
 * OpenStreetMap から大阪大学各キャンパスの建物（名称・座標）を取得し、
 * 冪等な SQL シード（lib/db/seed/osm_buildings.sql）を生成する開発用スクリプト。
 *
 * 実行時に Overpass API を叩くため、ランタイム（Workers）からは使わない。建物名
 * ラベルは buildings テーブルから配信する方針なので、これは一度きりの ETL。
 *
 * 使い方:
 *   node node_modules/tsx/dist/cli.mjs scripts/fetch-osm-buildings.ts
 *   その後 lib/db/seed/osm_buildings.sql を dev リモート D1 に適用する。
 *
 * キャンパス割り当て:
 *   - 豊中 / 吹田: OSM の amenity=university エリアポリゴン内の建物を抽出。
 *   - 箕面: 新キャンパス（箕面船場）は OSM 上で単一の複合棟「大阪大学 箕面キャンパス」
 *     としてのみ登録されており、周辺の商業ビルと混在する bbox では絞れないため、
 *     名称に「大阪大学」を含む建物のみ採用する。
 */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

// OSM の amenity=university エリア（way）ID。area ID = 2_400_000_000 + way ID。
const TOYONAKA_WAY = 508305218;
const SUITA_WAY = 237968488;
// 箕面新キャンパス（船場）の探索 bbox。商業ビルが混じるため後段で名称フィルタする。
const MINOH_BBOX = '34.8190,135.4870,34.8270,135.4960';

type CampusId = 'toyonaka' | 'suita' | 'minoh';

interface OverpassElement {
  type: string;
  id: number;
  center?: { lat: number; lon: number };
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
}

interface BuildingRow {
  id: string;
  campusId: CampusId;
  name: string;
  latitude: number;
  longitude: number;
}

// 給水機の設置候補になり得る「建物以外」の施設も取り込む。
// - 飲食（食堂・カフェ・フードコート）と図書館: amenity
// - グラウンド・プール・トラック・スタジアム: leisure
// - 競技施設（アーチェリー等）: sport=*
// いずれも name 必須。無名の pitch 等のノイズを自動除外する。
// 箕面は追加施設を入れない方針のため、従来どおり building のみ取得する。
const AMENITY_FILTER = '^(restaurant|cafe|food_court|library)$';
const LEISURE_FILTER = '^(pitch|track|stadium|swimming_pool)$';

const QUERY = `
[out:json][timeout:180];
way(${TOYONAKA_WAY}); map_to_area->.toyoA;
way(${SUITA_WAY}); map_to_area->.suitaA;
(
  way["building"]["name"](area.toyoA);
  nwr["amenity"~"${AMENITY_FILTER}"]["name"](area.toyoA);
  nwr["leisure"~"${LEISURE_FILTER}"]["name"](area.toyoA);
  nwr["sport"]["name"](area.toyoA);
)->.toyo;
(
  way["building"]["name"](area.suitaA);
  nwr["amenity"~"${AMENITY_FILTER}"]["name"](area.suitaA);
  nwr["leisure"~"${LEISURE_FILTER}"]["name"](area.suitaA);
  nwr["sport"]["name"](area.suitaA);
)->.suita;
( way["building"]["name"](${MINOH_BBOX}); )->.minoh;
.toyo out tags center;
.suita out tags center;
.minoh out tags center;
`;

/**
 * OSM の name タグに対する個別補正（規則で推測できない一点もの）。OSM の way ID で
 * 引く。再生成のたびに自動適用され、レビュー可能な形でコードに残す。OSM 本体の
 * 誤りはここで上書きする（例: 「A工学部/工学研究科 13棟」は「A」の位置誤り）。
 */
const NAME_OVERRIDES: Record<number, string> = {
  // https://www.openstreetmap.org/way/378258112
  378258112: '工学部/工学研究科 A13棟',
  // https://www.openstreetmap.org/way/311504482
  // 豊中の体育館は第二体育館と区別するため管理画面で「第一体育館」に改名済み。
  311504482: '第一体育館',
};

/**
 * OSM に存在するが name が無く自動取得できない施設に、名前を付けて取り込む。
 * id は OSM 要素に紐づけ（後で OSM 側に name が付いても同一 id で収束する）。
 * 座標は OSM の center を用いる。
 *
 * - 吹田キャンパスグラウンド: アーチェリー場のすぐ南東の多目的グラウンド
 *   （OSM way/491558076, leisure=pitch sport=multi, 無名）。
 * - 多目的ピッチ: 吹田キャンパス内のもう一つの多目的ピッチ
 *   （OSM way/530704512, leisure=pitch sport=multi, 無名）。
 */
const MANUAL_FACILITIES: BuildingRow[] = [
  {
    id: 'suita_osm_491558076',
    campusId: 'suita',
    name: '吹田キャンパスグラウンド',
    latitude: 34.815947,
    longitude: 135.524039,
  },
  {
    id: 'suita_osm_530704512',
    campusId: 'suita',
    name: '多目的ピッチ',
    latitude: 34.820764,
    longitude: 135.521583,
  },
];

/** 全角英数字・全角スペースを半角化し、空白を整理する。 */
function normalizeName(raw: string): string {
  const halfWidth = raw.replace(/[！-～]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
  );
  const cleaned = halfWidth
    .replace(/　/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    // 末尾の ASCII のみの括弧書き（ローマ字訳）を除去。例: 「待兼山会館 (Machikaneyama Facility)」
    // → 「待兼山会館」。中身に非 ASCII を含む括弧（例: 「(Σホール)」）は残す。
    .replace(/\s*\([\x20-\x7E]+\)\s*$/, '')
    .trim();

  // 棟コードの小文字化ゆれだけを安全に大文字化する。全体が「英字+数字+棟」の
  // ときに限定するため、固有名（例: 「IFReC動物実験棟」）は対象外。
  return cleaned.replace(
    /^([a-z]{1,3})(\d+棟)$/,
    (_, letters, rest) => `${(letters as string).toUpperCase()}${rest}`
  );
}

const CAMPUS_CENTERS: Record<CampusId, [number, number]> = {
  toyonaka: [34.804, 135.456],
  suita: [34.822, 135.525],
  minoh: [34.823, 135.4915],
};

function haversineMeters(
  [lat1, lng1]: [number, number],
  [lat2, lng2]: [number, number]
): number {
  const R = 6_371_000;
  const r = (x: number) => (x * Math.PI) / 180;
  const dLat = r(lat2 - lat1);
  const dLng = r(lng2 - lng1);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** 最寄りのキャンパス中心でキャンパスを判定する（豊中/吹田の振り分け用）。 */
function nearestCampus(lat: number, lng: number): CampusId {
  let best: CampusId = 'toyonaka';
  let bestDist = Infinity;
  for (const id of Object.keys(CAMPUS_CENTERS) as CampusId[]) {
    const d = haversineMeters([lat, lng], CAMPUS_CENTERS[id]);
    if (d < bestDist) {
      bestDist = d;
      best = id;
    }
  }
  return best;
}

function sqlString(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

async function main() {
  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'carrymybottle-osm-building-seed/1.0',
    },
    body: new URLSearchParams({ data: QUERY }),
  });
  if (!res.ok) {
    throw new Error(`Overpass request failed: ${res.status}`);
  }
  const data = (await res.json()) as { elements: OverpassElement[] };

  const seen = new Set<string>(); // `${campus}::${name}` で campus 内の重複名を排除
  const rows: BuildingRow[] = [];
  // 保育園など給水機の対象外で、既存 building 行として登録済みのものを削除するための id。
  const deleteIds = new Set<string>();

  // 手動施設を先に投入し、同名・同 id の OSM 要素は手動を優先してスキップする。
  const manualIds = new Set<string>();
  for (const f of MANUAL_FACILITIES) {
    rows.push(f);
    seen.add(`${f.campusId}::${f.name}`);
    manualIds.add(f.id);
  }

  for (const el of data.elements) {
    const center =
      el.center ?? (el.lat && el.lon ? { lat: el.lat, lon: el.lon } : null);
    const rawName = el.tags?.name;
    if (!center || !rawName) continue;

    const tags = el.tags ?? {};
    const campusId = nearestCampus(center.lat, center.lon);

    // 既存行 id。way は従来形式を維持（後方互換・冪等収束）、node/relation は
    // 型接頭辞で OSM の ID 空間衝突を避ける。
    const id =
      el.type === 'way'
        ? `${campusId}_osm_${el.id}`
        : `${campusId}_osm_${el.type[0]}${el.id}`;

    // 手動施設で先に投入済みの要素は OSM 側をスキップ（名前・座標は手動を優先）。
    if (manualIds.has(id)) continue;

    // 保育園（childcare / kindergarten）は給水機の対象外。新規に入れないだけでなく、
    // 既存 building 行（過去 seed で登録済み）を削除対象にする。箕面は触らない。
    if (tags.amenity === 'childcare' || tags.building === 'kindergarten') {
      if (campusId !== 'minoh') deleteIds.add(id);
      continue;
    }

    const name = NAME_OVERRIDES[el.id] ?? normalizeName(rawName);
    if (!name) continue;

    // 箕面は新キャンパスの建物（名称に「大阪大学」を含む）のみ採用する。
    if (campusId === 'minoh' && !name.includes('大阪大学')) continue;

    // 取り込み対象: 建物 / 指定 amenity（飲食・図書館）/ 指定 leisure / 競技施設。
    const amenityOk = /^(restaurant|cafe|food_court|library)$/.test(
      tags.amenity ?? ''
    );
    const leisureOk = /^(pitch|track|stadium|swimming_pool)$/.test(
      tags.leisure ?? ''
    );
    const wanted = !!tags.building || amenityOk || leisureOk || !!tags.sport;
    if (!wanted) continue;

    const dedupeKey = `${campusId}::${name}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    rows.push({
      id,
      campusId,
      name,
      latitude: Math.round(center.lat * 1e6) / 1e6,
      longitude: Math.round(center.lon * 1e6) / 1e6,
    });
  }

  rows.sort((a, b) =>
    a.campusId === b.campusId
      ? a.name.localeCompare(b.name, 'ja')
      : a.campusId.localeCompare(b.campusId)
  );

  const counts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.campusId] = (acc[r.campusId] ?? 0) + 1;
    return acc;
  }, {});

  const header = `-- OSM-derived building/facility seed (idempotent). Generated by scripts/fetch-osm-buildings.ts.
-- 建物に加え、給水機の設置候補になり得る施設（飲食=restaurant/cafe/food_court、
-- 図書館=library、グラウンド/プール等=leisure、競技施設=sport）も取り込む。
-- 保育園(childcare/kindergarten)は対象外として既存行を削除する。
-- Source: OpenStreetMap via Overpass API. © OpenStreetMap contributors (ODbL).
-- Run: wrangler d1 execute DB --remote --file=lib/db/seed/osm_buildings.sql
-- Counts: ${JSON.stringify(counts)}
-- INSERT OR IGNORE keeps existing rows (and the unique(campus_id, name) index
-- prevents name collisions with legacy seeds); the UPDATE refreshes coordinates
-- for OSM-sourced rows so re-running stays safe and converges.

`;

  // 建物の FK（campus_id -> campuses.id）を満たすため、キャンパス行も冪等に投入する。
  // dev リモート D1 には minoh が未投入のことがあるため、ここで担保する。
  const campusSeed = `INSERT OR IGNORE INTO campuses (id, name, map_image_path, created_at, updated_at)
VALUES
  ('toyonaka', '豊中', '/maps/toyonaka.png', strftime('%s','now'), strftime('%s','now')),
  ('suita',    '吹田', '/maps/suita.png',    strftime('%s','now'), strftime('%s','now')),
  ('minoh',    '箕面', '/maps/minoh.png',    strftime('%s','now'), strftime('%s','now'));

`;

  const insertValues = rows
    .map(
      (r) =>
        `  (${sqlString(r.id)}, ${sqlString(r.campusId)}, ${sqlString(r.name)}, 0, ${r.latitude}, ${r.longitude}, strftime('%s','now'), strftime('%s','now'))`
    )
    .join(',\n');

  // name も UPDATE 対象にすることで、既に投入済みの行（id は OSM way ID で安定）も
  // 補正後の名称・座標へ収束する。INSERT OR IGNORE は既存 id を更新しないため、
  // 表記ゆれ修正を再適用で反映させるにはこの UPDATE が必要。
  const updates = rows
    .map(
      (r) =>
        `UPDATE buildings SET name = ${sqlString(r.name)}, latitude = ${r.latitude}, longitude = ${r.longitude} WHERE id = ${sqlString(r.id)};`
    )
    .join('\n');

  // 対象外（保育園など）の既存行を削除する。FK 制約を満たすため、紐づく
  // 設置希望ターゲット・投票・コメントも先に掃除してから建物行を削除する。
  const deletes = [...deleteIds]
    .sort()
    .map(
      (id) =>
        `DELETE FROM installation_votes WHERE target_id IN (SELECT id FROM installation_targets WHERE building_id = ${sqlString(id)});
DELETE FROM installation_comments WHERE target_id IN (SELECT id FROM installation_targets WHERE building_id = ${sqlString(id)});
DELETE FROM installation_targets WHERE building_id = ${sqlString(id)};
DELETE FROM buildings WHERE id = ${sqlString(id)};`
    )
    .join('\n');

  const deletesBlock = deletes
    ? `\n-- 給水機の対象外（保育園など）の既存行を削除（紐づく投票データも掃除）。\n${deletes}\n`
    : '';

  const sql = `${header}${campusSeed}INSERT OR IGNORE INTO buildings (id, campus_id, name, sort_order, latitude, longitude, created_at, updated_at)
VALUES
${insertValues};

${updates}
${deletesBlock}`;

  const outPath = join(process.cwd(), 'lib/db/seed/osm_buildings.sql');
  await writeFile(outPath, sql, 'utf8');
  console.log(`Wrote ${rows.length} buildings -> ${outPath}`);
  console.log('Counts:', counts);
  console.log('Deletes (childcare etc.):', [...deleteIds]);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
