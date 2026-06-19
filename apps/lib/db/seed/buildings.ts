import type { DB } from '@/lib/db/client';
import { buildings } from '../schema';

/**
 * 開発用の建物シード。緯度・経度は地図タップ地点の近接建物抽出（設置希望投票）の
 * 動作確認に使う概算値。各建物内の給水機（seed/stations.ts）座標やキャンパス
 * 中心を基準にしているため、本番運用前に OSM 等で要確認。本番データは
 * seed/real_stations.sql 側で投入・backfill する。
 */
export async function seedBuildings(db: DB) {
  const now = new Date();
  await db
    .insert(buildings)
    .values([
      // 豊中キャンパス (toyonaka)
      {
        id: 'toyonaka_bldg_01',
        campusId: 'toyonaka',
        name: '全学教育推進機構',
        sortOrder: 10,
        latitude: 34.8056,
        longitude: 135.4538,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'toyonaka_bldg_02',
        campusId: 'toyonaka',
        name: '基礎工学部本館',
        sortOrder: 20,
        latitude: 34.803,
        longitude: 135.4585,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'toyonaka_bldg_03',
        campusId: 'toyonaka',
        name: '理学部本館',
        sortOrder: 30,
        latitude: 34.8052,
        longitude: 135.46,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'toyonaka_bldg_04',
        campusId: 'toyonaka',
        name: '総合図書館',
        sortOrder: 40,
        latitude: 34.8042,
        longitude: 135.4571,
        createdAt: now,
        updatedAt: now,
      },

      // 吹田キャンパス (suita)
      {
        id: 'suita_bldg_01',
        campusId: 'suita',
        name: '工学部センタースクエア',
        sortOrder: 10,
        latitude: 34.8221,
        longitude: 135.5238,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'suita_bldg_02',
        campusId: 'suita',
        name: '医学部本館',
        sortOrder: 20,
        latitude: 34.8195,
        longitude: 135.5189,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'suita_bldg_03',
        campusId: 'suita',
        name: '生命科学図書館',
        sortOrder: 30,
        latitude: 34.821,
        longitude: 135.5205,
        createdAt: now,
        updatedAt: now,
      },

      // 箕面キャンパス (minoh)
      {
        id: 'minoh_bldg_01',
        campusId: 'minoh',
        name: '外国語学部本館',
        sortOrder: 10,
        latitude: 34.8235,
        longitude: 135.491,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'minoh_bldg_02',
        campusId: 'minoh',
        name: '外国学図書館',
        sortOrder: 20,
        latitude: 34.824,
        longitude: 135.492,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'minoh_bldg_03',
        campusId: 'minoh',
        name: '学生交流プラザ',
        sortOrder: 30,
        latitude: 34.8268,
        longitude: 135.4842,
        createdAt: now,
        updatedAt: now,
      },
    ])
    .onConflictDoNothing();
}
