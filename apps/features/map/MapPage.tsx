import React from 'react';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getDb } from '@/lib/db/client';
import { trackEvent } from '@/lib/analytics/events';
import { isPrefetchRequest } from '@/lib/analytics/isPrefetchRequest';
import { getStationsByCampus } from './queries';
import { MapClient } from './MapClient';

export async function MapPage({ campusId }: { campusId: string }) {
  const { env } = await getCloudflareContext({ async: true });
  const db = getDb(env.DB);

  const isPrefetch = await isPrefetchRequest();

  // prefetch 以外のリクエストでのみ map_viewed イベントを記録する
  const trackPromise = isPrefetch
    ? Promise.resolve()
    : trackEvent({
        eventName: 'map_viewed',
        campusId,
      });

  // DBからのデータ取得とイベント記録を並列化して TTFB を改善する
  const [stations] = await Promise.all([
    getStationsByCampus(db, campusId),
    trackPromise,
  ]);

  return <MapClient stations={stations} />;
}
