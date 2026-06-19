/**
 * 地図タップ（クロスヘア）地点の近接建物抽出に使う純粋なジオメトリ関数。
 * 副作用を持たないので単体テストしやすいよう features/map から分離している。
 */

export interface LatLng {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_M = 6_371_000;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * 2地点間の大円距離（メートル）。ハーバーサイン公式。キャンパス内の近距離
 * なので十分な精度。
 */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * 中心点に近い建物を距離順（昇順）に最大 `limit` 件返す。各要素には
 * `distanceMeters` を付与する。`limit` 以下なら全件、同距離は安定ソート順。
 */
export function nearestBuildings<T extends LatLng>(
  center: LatLng,
  items: readonly T[],
  limit: number
): (T & { distanceMeters: number })[] {
  return items
    .map((item) => ({
      ...item,
      distanceMeters: haversineMeters(center, item),
    }))
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, Math.max(0, limit));
}

/** 距離（メートル）を人間に読みやすい文字列にする（例: 「約120m」「約1.3km」）。 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `約${Math.round(meters / 10) * 10}m`;
  }
  return `約${(meters / 1000).toFixed(1)}km`;
}
