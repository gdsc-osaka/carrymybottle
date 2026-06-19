import { describe, it, expect } from 'vitest';
import { formatDistance, haversineMeters, nearestBuildings } from '../voting';

describe('haversineMeters', () => {
  it('同一地点は0mになる', () => {
    const p = { latitude: 34.804, longitude: 135.456 };
    expect(haversineMeters(p, p)).toBe(0);
  });

  it('緯度1度の差は約111kmになる', () => {
    const d = haversineMeters(
      { latitude: 34, longitude: 135 },
      { latitude: 35, longitude: 135 }
    );
    expect(d).toBeGreaterThan(110_000);
    expect(d).toBeLessThan(112_000);
  });
});

describe('nearestBuildings', () => {
  const center = { latitude: 34.804, longitude: 135.456 };
  const items = [
    { id: 'far', latitude: 34.83, longitude: 135.49 },
    { id: 'near', latitude: 34.8041, longitude: 135.4561 },
    { id: 'mid', latitude: 34.81, longitude: 135.46 },
  ];

  it('距離の昇順に並べ、distanceMeters を付与する', () => {
    const result = nearestBuildings(center, items, 3);
    expect(result.map((r) => r.id)).toEqual(['near', 'mid', 'far']);
    expect(result[0].distanceMeters).toBeLessThan(result[1].distanceMeters);
  });

  it('limit で件数を制限する', () => {
    expect(nearestBuildings(center, items, 2)).toHaveLength(2);
    expect(nearestBuildings(center, items, 0)).toHaveLength(0);
  });
});

describe('formatDistance', () => {
  it('1km未満は10m単位のメートル表記', () => {
    expect(formatDistance(123)).toBe('約120m');
    expect(formatDistance(0)).toBe('約0m');
  });

  it('1km以上はkm表記', () => {
    expect(formatDistance(1340)).toBe('約1.3km');
  });
});
