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
 * handlers. The current-location pin is the built-in GeolocateControl dot,
 * which is visually distinct from the teal station droplets.
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

    const geolocate = new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserLocation: true,
    });
    map.addControl(geolocate, 'top-right');
    geolocate.on('error', () => {
      toast.error(
        '現在地を取得できませんでした。ブラウザの位置情報設定をご確認ください。'
      );
    });

    // 一度許可したユーザーは、次回以降ボタンを押さずに現在地取得を自動開始する。
    // 未許可(prompt)の状態で勝手に許可ダイアログを出さないよう、Permissions API で
    // 'granted' を確認できたときだけ trigger する。Permissions API 非対応ブラウザ
    // (古い iOS Safari 等)では何もせず、従来どおり手動操作にフォールバックする。
    map.once('load', () => {
      if (!navigator.permissions?.query) return;
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((status) => {
          if (status.state === 'granted') {
            geolocate.trigger();
          }
        })
        .catch(() => {
          // 取得失敗時は手動操作に任せる。
        });
    });

    setMapReady(true);

    const markers = markersRef.current;
    return () => {
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
