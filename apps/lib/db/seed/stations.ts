import type { DB } from '@/lib/db/client';
import { stations, stationTemperatures } from '../schema';

export async function seedStations(db: DB) {
  const now = new Date();

  // 1. 給水機本体のシード
  await db
    .insert(stations)
    .values([
      // 豊中キャンパス (toyonaka)
      {
        id: 'toyonaka_station_01',
        campusId: 'toyonaka',
        buildingId: 'toyonaka_bldg_01', // 全学教育推進機構
        name: '全学教育推進機構 1F ロビー',
        description: '正面玄関を入ってすぐ右手にあります。',
        relativeX: 0.25,
        relativeY: 0.6,
        status: 'available',
        isPublic: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'toyonaka_station_02',
        campusId: 'toyonaka',
        buildingId: 'toyonaka_bldg_04', // 総合図書館
        name: '総合図書館 2F',
        description: 'ラーニング・コモンズ付近にあります。',
        relativeX: 0.75,
        relativeY: 0.35,
        status: 'available',
        isPublic: true,
        createdAt: now,
        updatedAt: now,
      },

      // 吹田キャンパス (suita)
      {
        id: 'suita_station_01',
        campusId: 'suita',
        buildingId: 'suita_bldg_01', // 工学部センタースクエア
        name: 'センタースクエア 食堂前',
        description: '食堂の入り口付近に設置されています。',
        relativeX: 0.5,
        relativeY: 0.5,
        status: 'available',
        isPublic: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'suita_station_02',
        campusId: 'suita',
        buildingId: 'suita_bldg_02', // 医学部本館
        name: '医学部本館 1F',
        description: '学生ラウンジの奥です。',
        relativeX: 0.3,
        relativeY: 0.7,
        status: 'stopped',
        isPublic: true,
        createdAt: now,
        updatedAt: now,
      },

      // 箕面キャンパス (minoh)
      {
        id: 'minoh_station_01',
        campusId: 'minoh',
        buildingId: 'minoh_bldg_03', // 学生交流プラザ
        name: '学生交流プラザ',
        description: '入り口入ってすぐです。',
        relativeX: 0.8,
        relativeY: 0.2,
        status: 'available',
        isPublic: true,
        createdAt: now,
        updatedAt: now,
      },
    ])
    .onConflictDoNothing();

  // 2. 給水機の温度情報のシード (station_temperatures)
  await db
    .insert(stationTemperatures)
    .values([
      // toyonaka_station_01: 冷水と常温
      {
        stationId: 'toyonaka_station_01',
        temperatureType: 'cold',
        createdAt: now,
      },
      {
        stationId: 'toyonaka_station_01',
        temperatureType: 'normal',
        createdAt: now,
      },

      // toyonaka_station_02: 冷水のみ
      {
        stationId: 'toyonaka_station_02',
        temperatureType: 'cold',
        createdAt: now,
      },

      // suita_station_01: 冷水・常温・温水
      {
        stationId: 'suita_station_01',
        temperatureType: 'cold',
        createdAt: now,
      },
      {
        stationId: 'suita_station_01',
        temperatureType: 'normal',
        createdAt: now,
      },
      { stationId: 'suita_station_01', temperatureType: 'hot', createdAt: now },

      // suita_station_02: 冷水のみ
      {
        stationId: 'suita_station_02',
        temperatureType: 'cold',
        createdAt: now,
      },

      // minoh_station_01: 冷水と常温
      {
        stationId: 'minoh_station_01',
        temperatureType: 'cold',
        createdAt: now,
      },
      {
        stationId: 'minoh_station_01',
        temperatureType: 'normal',
        createdAt: now,
      },
    ])
    .onConflictDoNothing();
}
