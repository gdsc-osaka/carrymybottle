import React from 'react';
import { MapPin } from 'lucide-react';
import type { getStationsByCampus } from './queries';
import { cn } from '@/lib/utils';

export type StationWithRelations = Awaited<
  ReturnType<typeof getStationsByCampus>
>[number];

interface MapCanvasProps {
  mapImagePath: string;
  stations: StationWithRelations[];
  onStationClick?: (station: StationWithRelations) => void;
}

export function MapCanvas({
  mapImagePath,
  stations,
  onStationClick,
}: MapCanvasProps) {
  return (
    <div className="flex h-full w-full overflow-auto items-center justify-center bg-muted p-4">
      <div className="relative w-full max-w-[1200px] shadow-sm rounded-lg overflow-hidden bg-background">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mapImagePath}
          alt="Campus Map"
          className="w-full h-auto block"
        />

        {stations.map((station) => {
          const isAvailable = station.status === 'available';
          const pinColorClass =
            station.status === 'broken'
              ? 'text-destructive'
              : station.status === 'stopped'
                ? 'text-yellow-500'
                : 'text-primary';

          return (
            <button
              key={station.id}
              className={cn(
                'absolute flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-full hover:scale-110 transition-transform cursor-pointer group',
                pinColorClass
              )}
              style={{
                left: `${station.relativeX * 100}%`,
                top: `${station.relativeY * 100}%`,
              }}
              onClick={() => onStationClick?.(station)}
              aria-label={station.name}
            >
              <MapPin className="h-8 w-8 drop-shadow-md fill-background" />
              <div className="absolute top-full mt-1 px-2 py-1 bg-popover text-popover-foreground text-xs font-medium rounded shadow-md opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity z-10">
                {station.name}
                {!isAvailable && (
                  <span className="ml-1 text-muted-foreground">
                    ({station.status})
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
