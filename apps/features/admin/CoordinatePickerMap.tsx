'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { CAMPUSES } from '@/lib/constants/campuses';

interface Props {
  campusId: string;
  latitude: number | null;
  longitude: number | null;
  onChange: (latitude: number, longitude: number) => void;
}

const STYLE_URL = '/map-style/style.json';
const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

function campusCenter(campusId: string): [number, number] {
  const campus = CAMPUSES.find((c) => c.id === campusId) ?? CAMPUSES[0];
  return [campus.center.lng, campus.center.lat];
}

/**
 * Admin coordinate picker: click the map (or drag the marker) to set a
 * station's latitude/longitude. maplibre-gl is browser-only, so this must be
 * loaded with `dynamic(..., { ssr: false })`.
 */
export default function CoordinatePickerMap({
  campusId,
  latitude,
  longitude,
  onChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  // Keep the latest onChange without re-running the init effect.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Initialise once.
  useEffect(() => {
    if (!containerRef.current) return;
    const hasCoord = latitude != null && longitude != null;
    const center: [number, number] = hasCoord
      ? [longitude, latitude]
      : campusCenter(campusId);

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center,
      zoom: 16,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }));

    const place = (lng: number, lat: number) => {
      if (!markerRef.current) {
        markerRef.current = new maplibregl.Marker({ draggable: true });
        markerRef.current.on('dragend', () => {
          const { lng: mlng, lat: mlat } = markerRef.current!.getLngLat();
          onChangeRef.current(round6(mlat), round6(mlng));
        });
      }
      markerRef.current.setLngLat([lng, lat]).addTo(map);
    };

    if (hasCoord) place(longitude, latitude);

    map.on('click', (e) => {
      place(e.lngLat.lng, e.lngLat.lat);
      onChangeRef.current(round6(e.lngLat.lat), round6(e.lngLat.lng));
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Init once; subsequent prop changes are handled by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recenter to the selected campus while no coordinate has been chosen yet.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || markerRef.current) return;
    map.flyTo({ center: campusCenter(campusId), zoom: 16, duration: 800 });
  }, [campusId]);

  // Reflect externally-set coordinates (e.g. typed into the number inputs).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || latitude == null || longitude == null) return;
    if (!markerRef.current) {
      markerRef.current = new maplibregl.Marker({ draggable: true });
      markerRef.current.on('dragend', () => {
        const { lng, lat } = markerRef.current!.getLngLat();
        onChangeRef.current(round6(lat), round6(lng));
      });
    }
    markerRef.current.setLngLat([longitude, latitude]).addTo(map);
  }, [latitude, longitude]);

  return (
    <div
      ref={containerRef}
      className="h-64 w-full overflow-hidden rounded border"
    />
  );
}
