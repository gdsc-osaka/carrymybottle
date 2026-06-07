import type { VariantProps } from 'class-variance-authority';
import type { badgeVariants } from '@/components/ui/badge';
import type { Station } from '@/lib/db/types';

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
