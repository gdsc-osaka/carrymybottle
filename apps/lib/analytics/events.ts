import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getDb } from '@/lib/db/client';
import { analyticsEvents } from '@/lib/db/schema';

type TrackEventParams = {
  eventName: string;
  stationId?: string;
  campusId?: string;
  buildingId?: string;
  source?: string;
  metadataJson?: string;
};

export async function trackEvent(params: TrackEventParams): Promise<void> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const db = getDb(env.DB);

    await db.insert(analyticsEvents).values({
      id: crypto.randomUUID(),
      eventName: params.eventName,
      stationId: params.stationId,
      campusId: params.campusId,
      buildingId: params.buildingId,
      source: params.source,
      metadataJson: params.metadataJson,
      environment: env.APP_ENV ?? 'development',
      createdAt: new Date(),
    });
  } catch {
    // analytics 失敗はメイン処理に影響させない
  }
}
