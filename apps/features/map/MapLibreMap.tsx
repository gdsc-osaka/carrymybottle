'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';
import { CAMPUSES, type CampusId } from '@/lib/constants/campuses';
import { StationPin } from './StationPin';
import type { StationWithRelations } from './types';

interface Props {
  stations: StationWithRelations[];
  campusId: CampusId;
  onStationClick?: (station: StationWithRelations) => void;
}

const STYLE_URL = '/map-style/style.json';

// 現在地の精度サークル用の source / layer ID。
const ACCURACY_SOURCE_ID = 'cmb-user-accuracy';
const ACCURACY_LAYER_ID = 'cmb-user-accuracy-fill';

/** 精度サークルのポリゴン Feature(GeoJSON 互換の最小形)。 */
interface AccuracyCircleFeature {
  type: 'Feature';
  geometry: { type: 'Polygon'; coordinates: [number, number][][] };
  properties: Record<string, never>;
}

/**
 * 現在地の精度(メートル)を表す円を地理ポリゴンとして生成する。ピクセルではなく
 * 実寸の GeoJSON なので、MapLibre が地図のズームに応じて自動で拡縮する。
 */
function buildAccuracyCircle(
  lng: number,
  lat: number,
  radiusMeters: number,
  steps = 64
): AccuracyCircleFeature {
  const earthRadius = 6378137;
  const latRad = (lat * Math.PI) / 180;
  const ring: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * 2 * Math.PI;
    const dx = radiusMeters * Math.cos(theta);
    const dy = radiusMeters * Math.sin(theta);
    const dLng = ((dx / (earthRadius * Math.cos(latRad))) * 180) / Math.PI;
    const dLat = ((dy / earthRadius) * 180) / Math.PI;
    ring.push([lng + dLng, lat + dLat]);
  }
  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [ring] },
    properties: {},
  };
}

/**
 * Renders the campus map with MapLibre GL + OpenFreeMap vector tiles.
 *
 * Station pins are MapLibre Markers whose DOM elements host a React-rendered
 * {@link StationPin} via portal, so they keep Tailwind styling and click
 * handlers. The current-location pin is a custom blue Marker tracked via
 * `watchPosition` (visually distinct from the teal station droplets); the
 * GeolocateControl button only recenters on demand and never auto-follows.
 *
 * maplibre-gl is browser-only, so this component must be loaded with
 * `dynamic(..., { ssr: false })` from a Client Component.
 */
export default function MapLibreMap({
  stations,
  campusId,
  onStationClick,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const campusIdRef = useRef(campusId);
  const isFirstCampusEffect = useRef(true);
  const [mapReady, setMapReady] = useState(false);
  // 地図(タイル/スタイル)読み込み完了とピン配置完了の2段階。ピンの方が早く
  // 終わるため、両方が揃うまでローディングオーバーレイを表示し続ける。
  const [mapLoaded, setMapLoaded] = useState(false);
  const [pinsReady, setPinsReady] = useState(false);
  const [pins, setPins] = useState<
    { station: StationWithRelations; el: HTMLElement }[]
  >([]);

  // Initialise the map once. The initial center is read from a ref so changing
  // the campus prop animates (flyTo effect) instead of re-creating the map.
  useEffect(() => {
    if (!containerRef.current) return;
    const initial =
      CAMPUSES.find((c) => c.id === campusIdRef.current) ?? CAMPUSES[0];

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [initial.center.lng, initial.center.lat],
      zoom: initial.zoom,
      attributionControl: false,
    });
    mapRef.current = map;

    // 現在地の最新測位結果。ドット・精度サークルの描画と、ボタンでの再センタリングで
    // 共有する。
    let lastUserLngLat: [number, number] | null = null;
    let lastAccuracyMeters: number | null = null;

    const updateAccuracyCircle = () => {
      const source =
        map.getSource<maplibregl.GeoJSONSource>(ACCURACY_SOURCE_ID);
      if (!source || !lastUserLngLat || lastAccuracyMeters === null) return;
      source.setData({
        type: 'FeatureCollection',
        features: [
          buildAccuracyCircle(
            lastUserLngLat[0],
            lastUserLngLat[1],
            lastAccuracyMeters
          ),
        ],
      });
    };

    // タイル/スタイルの初回読み込み完了。ローディング解除の片方の条件。
    map.on('load', () => setMapLoaded(true));

    // 現在地の精度サークル(薄い青の円)。DOM ではなく地理ポリゴンの fill レイヤーで
    // 描くため、ズームに応じて実寸で拡縮し、canvas 描画なので給水ピン(DOMマーカー)の
    // クリックを奪わない。空のソース/レイヤーを用意し、測位ごとに setData で更新する。
    map.on('load', () => {
      if (map.getSource(ACCURACY_SOURCE_ID)) return;
      map.addSource(ACCURACY_SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: ACCURACY_LAYER_ID,
        type: 'fill',
        source: ACCURACY_SOURCE_ID,
        paint: {
          'fill-color': '#1f6fc4',
          'fill-opacity': 0.12,
          'fill-outline-color': '#1f6fc4',
        },
      });
      // ロード前に測位済みなら、ここで円を反映する。
      updateAccuracyCircle();
    });

    // OpenFreeMapのスプライトに無いPOIアイコン(class/subclass名)が要求される
    // たびに警告が出るので、透明1pxを登録して抑止する。該当POIはテキスト
    // ラベルのみで描画される(元の挙動と同じ)。
    map.on('styleimagemissing', (e) => {
      if (!map.hasImage(e.id)) {
        map.addImage(e.id, { width: 1, height: 1, data: new Uint8Array(4) });
      }
    });

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      'top-right'
    );
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      'bottom-right'
    );

    // 現在地ドット・現在地ボタンは自前で実装する。MapLibre 既定の GeolocateControl は
    // trackUserLocation:true だと GPS 更新のたびにカメラを現在地へ引き戻して地図操作を
    // 妨げ、false にするとボタンが getCurrentPosition(一度きりの高精度測位)に依存して
    // 端末次第で遅延・失敗し無反応に見える。そこで watchPosition を常時動かして位置だけ
    // を更新し(カメラは動かさない)、ボタンはその最新位置へ一度きり寄せる方式にする。
    const userLocationEl = document.createElement('div');
    userLocationEl.className = 'cmb-user-location';
    const userLocationMarker = new maplibregl.Marker({
      element: userLocationEl,
    });
    let userLocationAdded = false;
    // ボタン押下時にまだ未測位だった場合、初回測位で一度だけ寄せるためのフラグ。
    let centerOnNextFix = false;
    let geoWatchId: number | null = null;

    const recenterToUser = (lngLat: [number, number]) => {
      map.easeTo({
        center: lngLat,
        zoom: Math.max(map.getZoom(), 16),
        duration: 800,
      });
    };

    const startUserLocationWatch = () => {
      if (geoWatchId !== null || !navigator.geolocation) return;
      geoWatchId = navigator.geolocation.watchPosition(
        (pos) => {
          lastUserLngLat = [pos.coords.longitude, pos.coords.latitude];
          lastAccuracyMeters = pos.coords.accuracy;
          userLocationMarker.setLngLat(lastUserLngLat);
          // 精度サークルを最新の位置・精度に更新する。
          updateAccuracyCircle();
          // 初回測位でマーカーを地図に載せる(以降は位置のみ更新)。
          if (!userLocationAdded) {
            userLocationMarker.addTo(map);
            userLocationAdded = true;
          }
          // ボタンを押した時点で未測位だった場合は、初回測位で一度だけ寄せる。
          if (centerOnNextFix) {
            centerOnNextFix = false;
            recenterToUser(lastUserLngLat);
          }
        },
        () => {
          // ボタン操作に対する測位失敗のときだけ通知する。
          if (centerOnNextFix) {
            centerOnNextFix = false;
            toast.error(
              '現在地を取得できませんでした。ブラウザの位置情報設定をご確認ください。'
            );
          }
        },
        { enableHighAccuracy: true }
      );
    };

    // 現在地ボタン(自前)。押したときだけ watch の最新位置へ一度きり寄せる(追従しない)。
    // 未測位ならまず watch を開始し(未許可なら許可ダイアログ)、初回測位で寄せる。
    const handleRecenterClick = () => {
      startUserLocationWatch();
      if (lastUserLngLat) {
        recenterToUser(lastUserLngLat);
      } else {
        centerOnNextFix = true;
      }
    };

    // MapLibre 既定の現在地ボタンと同じ見た目になるよう、同じクラスを再利用する。
    const geolocateButton = document.createElement('button');
    geolocateButton.type = 'button';
    geolocateButton.className = 'maplibregl-ctrl-geolocate';
    geolocateButton.title = '現在地へ移動';
    geolocateButton.setAttribute('aria-label', '現在地へ移動');
    const geolocateIcon = document.createElement('span');
    geolocateIcon.className = 'maplibregl-ctrl-icon';
    geolocateIcon.setAttribute('aria-hidden', 'true');
    geolocateButton.appendChild(geolocateIcon);
    geolocateButton.addEventListener('click', handleRecenterClick);

    const geolocateControl: maplibregl.IControl = {
      onAdd: () => {
        const container = document.createElement('div');
        container.className = 'maplibregl-ctrl maplibregl-ctrl-group';
        container.appendChild(geolocateButton);
        return container;
      },
      onRemove: () => {
        geolocateButton.removeEventListener('click', handleRecenterClick);
      },
    };
    map.addControl(geolocateControl, 'top-right');

    // 位置情報を許可済みのユーザーは、ロード時点から現在地ドットを表示する
    // (カメラは動かさない)。未許可(prompt)の状態では勝手に許可ダイアログを出さない
    // よう、Permissions API で 'granted' を確認できたときだけ watch を開始する。
    // Permissions API 非対応ブラウザ(古い iOS Safari 等)では何もせず、現在地ボタンの
    // 手動操作にフォールバックする。
    map.once('load', () => {
      if (!navigator.permissions?.query) return;
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((status) => {
          if (status.state === 'granted') {
            startUserLocationWatch();
          }
        })
        .catch(() => {
          // 取得失敗時は手動操作に任せる。
        });
    });

    setMapReady(true);

    const markers = markersRef.current;
    return () => {
      if (geoWatchId !== null) {
        navigator.geolocation.clearWatch(geoWatchId);
      }
      userLocationMarker.remove();
      map.remove();
      mapRef.current = null;
      markers.clear();
    };
  }, []);

  // Animate to the selected campus on tab change (skip the initial mount).
  useEffect(() => {
    const map = mapRef.current;
    campusIdRef.current = campusId;
    if (!map) return;
    if (isFirstCampusEffect.current) {
      isFirstCampusEffect.current = false;
      return;
    }
    const campus = CAMPUSES.find((c) => c.id === campusId);
    if (!campus) return;
    map.flyTo({
      center: [campus.center.lng, campus.center.lat],
      zoom: campus.zoom,
      duration: 1200,
    });
  }, [campusId]);

  // Sync markers to the current stations (skip stations without coordinates).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const markers = markersRef.current;

    const valid = stations.flatMap((station) =>
      station.latitude != null && station.longitude != null
        ? [{ station, lng: station.longitude, lat: station.latitude }]
        : []
    );
    const validIds = new Set(valid.map((v) => v.station.id));

    for (const [id, marker] of markers) {
      if (!validIds.has(id)) {
        marker.remove();
        markers.delete(id);
      }
    }

    const nextPins: { station: StationWithRelations; el: HTMLElement }[] = [];
    for (const { station, lng, lat } of valid) {
      let marker = markers.get(station.id);
      if (!marker) {
        const el = document.createElement('div');
        marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([lng, lat])
          .addTo(map);
        markers.set(station.id, marker);
      } else {
        marker.setLngLat([lng, lat]);
      }
      nextPins.push({ station, el: marker.getElement() });
    }
    setPins(nextPins);
    setPinsReady(true);
  }, [stations, mapReady]);

  const loading = !(mapLoaded && pinsReady);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {pins.map(({ station, el }) =>
        createPortal(
          <StationPin station={station} onClick={onStationClick} />,
          el,
          station.id
        )
      )}
      {/* 地図タイルとピンの両方が揃うまでオーバーレイで覆う。 */}
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted">
          <Spinner className="size-8 text-[#0f897f]" />
        </div>
      )}
    </div>
  );
}
