import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getDb } from '@/lib/db/client';
import { analyticsEvents } from '@/lib/db/schema';

/**
 * 解析イベントの環境（environment）を解決する。
 *
 * 記録（{@link trackEvent}）と集計（管理画面の分析ページ）で必ず同じ値を使うため
 * 共通化している。`APP_ENV` が未設定・空文字のときは 'development' に寄せる
 * （`??` だと空文字を残してしまい、記録環境と集計環境がズレる事故になるため `||`）。
 */
export function resolveEnvironment(env: { APP_ENV?: string }): string {
  return env.APP_ENV || 'development';
}

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
      environment: resolveEnvironment(env),
      createdAt: new Date(),
    });
  } catch {
    // analytics 失敗はメイン処理に影響させない
  }
}
