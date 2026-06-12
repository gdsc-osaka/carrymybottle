import type { getStationsByCampus } from './queries';

/**
 * A station hydrated with its campus, building, and temperature relations,
 * as returned by {@link getStationsByCampus}.
 */
export type StationWithRelations = Awaited<
  ReturnType<typeof getStationsByCampus>
>[number];
