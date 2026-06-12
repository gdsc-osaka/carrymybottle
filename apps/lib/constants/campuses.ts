/**
 * 各キャンパスの地図表示設定。
 *
 * center / zoom は MapLibre のベクトルタイル地図の初期表示・タブ切替時の
 * flyTo に使う。座標は概算値のため、運用前に OSM で要確認（特に箕面：
 * 旧青山キャンパスではなく箕面船場阪大前駅近くの新キャンパス）。
 */
export const CAMPUSES = [
  {
    id: 'toyonaka',
    name: '豊中',
    center: { lat: 34.804, lng: 135.456 },
    zoom: 16,
  },
  {
    id: 'suita',
    name: '吹田',
    center: { lat: 34.822, lng: 135.525 },
    zoom: 15.5,
  },
  {
    id: 'minoh',
    name: '箕面',
    center: { lat: 34.827, lng: 135.484 },
    zoom: 16,
  },
] as const;

export type CampusId = (typeof CAMPUSES)[number]['id'];
