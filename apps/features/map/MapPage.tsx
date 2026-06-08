import React from 'react';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getDb } from '@/lib/db/client';
import { trackEvent } from '@/lib/analytics/events';
import { isPrefetchRequest } from '@/lib/analytics/isPrefetchRequest';
import { getStationsByCampus } from './queries';
import { MapClient } from './MapClient';
import { ResultAsync } from 'neverthrow';

export async function MapPage({ campusId }: { campusId: string }) {
  const dbFetchResult = ResultAsync.fromPromise(
    getCloudflareContext({ async: true }),
    (e) => new Error('Failed to get Cloudflare context', { cause: e })
  )
    .map(({ env }) => getDb(env.DB))
    .andThen((db) =>
      ResultAsync.fromPromise(
        getStationsByCampus(db, campusId),
        (e) => new Error('Failed to fetch stations', { cause: e })
      )
    );

  const trackResult = ResultAsync.fromPromise(
    isPrefetchRequest(),
    (e) => new Error('Failed to check prefetch', { cause: e })
  ).andThen((isPrefetch) =>
    ResultAsync.fromPromise(
      isPrefetch
        ? Promise.resolve()
        : trackEvent({ eventName: 'map_viewed', campusId }),
      (e) => new Error('Failed to track event', { cause: e })
    )
  );

  const pageResult = await ResultAsync.combine([dbFetchResult, trackResult]);

  return pageResult.match(
    ([stations]) => <MapClient stations={stations} />,
    (error) => {
      console.error(error);
      return (
        <div className="flex h-[100dvh] items-center justify-center p-4 text-destructive">
          データの読み込みに失敗しました。時間をおいて再試行してください。
        </div>
      );
    }
  );
}
