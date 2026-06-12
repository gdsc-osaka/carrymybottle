/**
 * 管理画面で使う色付きバッジのクラスマップ。
 *
 * プロジェクトのテーマトークンは無彩色（白黒）のため、一覧の視認性を上げる目的で
 * Tailwind 標準パレットの色を明示的に当てる。`Badge variant="outline"` の上に
 * className で重ねて使う想定。
 */
import type { Station, StationTemperature } from '@/lib/db/types';

type StatusType = Station['status'];
type TemperatureType = StationTemperature['temperatureType'];
type IssueType =
  | 'broken'
  | 'stopped'
  | 'no_water'
  | 'leak_or_abnormal'
  | 'other';

/** 給水機ステータスの色（利用可能=緑 / 停止中=黄 / 故障中=赤）。 */
export const STATUS_BADGE_CLASS: Record<StatusType, string> = {
  available: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  stopped: 'border-amber-200 bg-amber-50 text-amber-700',
  broken: 'border-rose-200 bg-rose-50 text-rose-700',
};

/** 水温種別の色（冷水=水色 / 常温=灰 / 温水=橙）。 */
export const TEMPERATURE_BADGE_CLASS: Record<TemperatureType, string> = {
  cold: 'border-sky-200 bg-sky-50 text-sky-700',
  normal: 'border-slate-200 bg-slate-50 text-slate-600',
  hot: 'border-orange-200 bg-orange-50 text-orange-700',
};

/** 公開状態の色。 */
export const VISIBILITY_BADGE_CLASS = {
  public: 'border-teal-200 bg-teal-50 text-teal-700',
  private: 'border-slate-200 bg-slate-100 text-slate-500',
} as const;

/** 緊急連絡の問題種別の色。 */
export const ISSUE_BADGE_CLASS: Record<IssueType, string> = {
  broken: 'border-rose-200 bg-rose-50 text-rose-700',
  stopped: 'border-amber-200 bg-amber-50 text-amber-700',
  no_water: 'border-orange-200 bg-orange-50 text-orange-700',
  leak_or_abnormal: 'border-rose-200 bg-rose-50 text-rose-700',
  other: 'border-slate-200 bg-slate-50 text-slate-600',
};
