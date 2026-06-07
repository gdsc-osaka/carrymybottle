import React from 'react';
import { MapPin } from 'lucide-react';
import {
  TransformWrapper,
  TransformComponent,
  useTransformContext,
} from 'react-zoom-pan-pinch';
import type { getStationsByCampus } from './queries';
import { cn } from '@/lib/utils';

/**
 * Represents a station with its associated campus, building, and temperatures.
 */
export type StationWithRelations = Awaited<
  ReturnType<typeof getStationsByCampus>
>[number];

/**
 * Props for the MapCanvas component.
 */
interface MapCanvasProps {
  /** The URL path to the campus map image. */
  mapImagePath: string;
  /** An array of stations to display on the map. */
  stations: StationWithRelations[];
  /** Optional callback triggered when a station pin is clicked. */
  onStationClick?: (station: StationWithRelations) => void;
}

/**
 * Renders the station pins on the map, applying counter-scaling so that
 * the pins remain visually the same size when the map is zoomed.
 *
 * @param props - The component props containing stations and click handler.
 * @returns The rendered pins.
 */
function MapPins({
  stations,
  onStationClick,
}: {
  stations: StationWithRelations[];
  onStationClick?: (station: StationWithRelations) => void;
}) {
  const context = useTransformContext();
  const scale = context.state.scale;
  const invertedScale = 1 / scale;

  return (
    <>
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
              'absolute flex flex-col items-center justify-center cursor-pointer group',
              pinColorClass
            )}
            style={{
              left: `${station.relativeX * 100}%`,
              top: `${station.relativeY * 100}%`,
              transform: `translate(-50%, -100%) scale(${invertedScale})`,
              transformOrigin: 'bottom center',
            }}
            onClick={() => onStationClick?.(station)}
            aria-label={station.name}
          >
            <MapPin className="h-8 w-8 drop-shadow-md fill-background transition-transform group-hover:scale-110" />
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
    </>
  );
}

/**
 * An interactive map canvas that supports zoom and pan operations.
 * Renders the campus map image and the given station pins on top.
 *
 * @param props - The component props.
 * @returns The rendered map canvas component.
 */
export function MapCanvas({
  mapImagePath,
  stations,
  onStationClick,
}: MapCanvasProps) {
  return (
    <div className="flex h-full w-full overflow-hidden items-center justify-center bg-muted p-4">
      <TransformWrapper
        initialScale={1}
        minScale={1}
        maxScale={5}
        centerOnInit={true}
      >
        <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }}>
          <div className="relative w-full max-w-[1200px] shadow-sm rounded-lg overflow-hidden bg-background mx-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mapImagePath}
              alt="Campus Map"
              className="w-full h-auto block"
            />
            <MapPins stations={stations} onStationClick={onStationClick} />
          </div>
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}
