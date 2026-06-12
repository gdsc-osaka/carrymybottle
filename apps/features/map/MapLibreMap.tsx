'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { toast } from 'sonner';
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
  }, [stations, mapReady]);

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
    </div>
  );
}
