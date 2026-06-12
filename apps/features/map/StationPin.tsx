'use client';

import { Droplet } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StationWithRelations } from './types';

const STATUS_RING: Record<StationWithRelations['status'], string> = {
  available: 'ring-teal-500 text-teal-600',
  stopped: 'ring-yellow-500 text-yellow-600',
  broken: 'ring-rose-500 text-rose-600',
};

const STATUS_LABEL: Record<StationWithRelations['status'], string> = {
  available: '利用可能',
  stopped: '停止中',
  broken: '故障中',
};

interface Props {
  station: StationWithRelations;
  onClick?: (station: StationWithRelations) => void;
}

/**
 * A water-dispenser marker. Rendered (via portal) into a MapLibre Marker's
 * DOM element, anchored so the pointer tip sits on the station coordinate.
 * Visually distinct from the GeolocateControl's blue current-location dot.
 */
export function StationPin({ station, onClick }: Props) {
  const isAvailable = station.status === 'available';

  return (
    <button
      type="button"
      onClick={() => onClick?.(station)}
      aria-label={station.name}
      className="group relative flex cursor-pointer flex-col items-center"
    >
      {/* Badge */}
      <span
        className={cn(
          'flex size-8 items-center justify-center rounded-full bg-white shadow-md ring-2 transition-transform group-hover:scale-110',
          STATUS_RING[station.status]
        )}
      >
        <Droplet className="size-4 fill-current" />
      </span>
      {/* Pointer tail (tip touches the coordinate via marker anchor 'bottom') */}
      <span
        className={cn(
          '-mt-0.5 size-2 rotate-45 rounded-[1px] bg-white shadow-md ring-2',
          STATUS_RING[station.status]
        )}
      />
      {/* Hover tooltip */}
      <span className="pointer-events-none absolute bottom-full mb-1 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100">
        {station.name}
        {!isAvailable && (
          <span className="ml-1 text-slate-300">
            ({STATUS_LABEL[station.status]})
          </span>
        )}
      </span>
    </button>
  );
}
