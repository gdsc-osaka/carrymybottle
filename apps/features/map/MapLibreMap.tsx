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

    // 現在地の最新測位結果。ドット描画とボタンでの再センタリングで共有する。
    let lastUserLngLat: [number, number] | null = null;
    // アンマウント後に非同期コールバック(Permissions / watch)が削除済みマップを
    // 触らないためのフラグ。クリーンアップで true にする。
    let isCancelled = false;

    // タイル/スタイルの初回読み込み完了。ローディング解除の片方の条件。
    map.on('load', () => setMapLoaded(true));

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

    // 測位待ちの間はボタンを待機表示(MapLibre 標準のスピナー)にし、押しても
    // 反応していないように見えないようにする。
    const setWaiting = (waiting: boolean) => {
      geolocateButton.classList.toggle(
        'maplibregl-ctrl-geolocate-waiting',
        waiting
      );
    };

    const recenterToUser = (lngLat: [number, number]) => {
      map.easeTo({
        center: lngLat,
        zoom: Math.max(map.getZoom(), 16),
        duration: 800,
      });
    };

    const startUserLocationWatch = () => {
      if (isCancelled || geoWatchId !== null || !navigator.geolocation) return;
      geoWatchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (isCancelled) return;
          lastUserLngLat = [pos.coords.longitude, pos.coords.latitude];
          userLocationMarker.setLngLat(lastUserLngLat);
          // 初回測位でマーカーを地図に載せる(以降は位置のみ更新)。
          if (!userLocationAdded) {
            userLocationMarker.addTo(map);
            userLocationAdded = true;
          }
          // ボタンを押した時点で未測位だった場合は、初回測位で一度だけ寄せる。
          if (centerOnNextFix) {
            centerOnNextFix = false;
            setWaiting(false);
            recenterToUser(lastUserLngLat);
          }
        },
        (err) => {
          // ボタン操作に対する測位失敗のときだけ通知する。
          if (centerOnNextFix) {
            centerOnNextFix = false;
            setWaiting(false);
            toast.error(
              '現在地を取得できませんでした。ブラウザの位置情報設定をご確認ください。'
            );
          }
          // 許可拒否は watch が二度と成功・通知しないため、watch を畳んで次回ボタン
          // 押下で再試行(=再通知)できるようにする。一時的なエラーは watch を維持して
          // 回復に任せる。
          if (err.code === err.PERMISSION_DENIED && geoWatchId !== null) {
            navigator.geolocation.clearWatch(geoWatchId);
            geoWatchId = null;
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
        setWaiting(true);
      }
    };

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
          if (status.state === 'granted' && !isCancelled) {
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
      // 非同期コールバックが削除済みマップを触らないよう、まず無効化する。
      isCancelled = true;
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
