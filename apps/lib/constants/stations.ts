import type { VariantProps } from 'class-variance-authority';
import type { badgeVariants } from '@/components/ui/badge';
import type { Station, StationTemperature } from '@/lib/db/types';

type BadgeVariant = VariantProps<typeof badgeVariants>['variant'];

/** 給水機ステータスの表示名（DesignDoc §6.1）。 */
export const STATION_STATUS_LABELS: Record<Station['status'], string> = {
  available: '利用可能',
  stopped: '停止中',
  broken: '故障中',
};

/** 給水機ステータスに対応する Badge のバリアント。 */
export const STATION_STATUS_BADGE_VARIANT: Record<
  Station['status'],
  BadgeVariant
> = {
  available: 'default',
  stopped: 'secondary',
  broken: 'destructive',
};

type TemperatureType = StationTemperature['temperatureType'];

/** 水温種別の表示名（DesignDoc §6.2）。 */
export const STATION_TEMPERATURE_LABELS: Record<TemperatureType, string> = {
  cold: '冷水',
  normal: '常温水',
  hot: '温水',
};

/** 水温種別バッジの表示順（冷水 → 常温水 → 温水）。 */
export const STATION_TEMPERATURE_ORDER: readonly TemperatureType[] = [
  'cold',
  'normal',
  'hot',
];

/** 給水機の利用可能時間（#213）。時間帯はすべて平日。 */
export interface StationAvailableHours {
  /** 利用可能な時間帯（平日）。例: `10:00〜17:30`。 */
  weekdayHours: string;
  /** 営業時間外・土日の扱いなどの補足文言。 */
  note: string;
}

/**
 * 給水機ごとの利用可能時間（#213）。給水機 ID（`real_stations.sql`）をキーとする。
 * すべて平日の時間帯。一覧に無い給水機は利用可能時間を表示しない（未確定）。
 *
 * 給水機 ID と通称の対応:
 * - `toyonaka_fukuri_coop`  … 豊中福利会館（生協コンビニ）
 * - `toyonaka_zengaku_a`    … 共通棟（全学教育推進機構 管理・講義A棟 / ピロティ正面）
 * - `suita_coop_honbumae`   … 吹田福利会館（生協コンビニ本部前店）
 * - `suita_m3_212`          … M3棟（212講義室前）
 */
export const STATION_AVAILABLE_HOURS: Record<string, StationAvailableHours> = {
  toyonaka_fukuri_coop: {
    weekdayHours: '10:00〜17:30',
    note: '営業時間外はご利用いただけません。',
  },
  toyonaka_zengaku_a: {
    weekdayHours: '8:00〜20:00',
    note: '土日は建物が開いている際にはご利用いただける場合がございます。',
  },
  suita_coop_honbumae: {
    weekdayHours: '10:00〜17:00',
    note: '営業時間外はご利用いただけません。',
  },
  suita_m3_212: {
    weekdayHours: '8:00〜20:00',
    note: '土日は建物が開いている際にはご利用いただける場合がございます。',
  },
};
