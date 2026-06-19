'use client';

import { Droplet } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StationWithRelations } from './types';

/** ステータスはピンの「リング（枠）」で表現する（DesignDoc §6.1 / #214）。 */
const STATUS_RING: Record<StationWithRelations['status'], string> = {
  available: 'ring-teal-500',
  stopped: 'ring-yellow-500',
  broken: 'ring-rose-500',
};

const STATUS_LABEL: Record<StationWithRelations['status'], string> = {
  available: '利用可能',
  stopped: '停止中',
  broken: '故障中',
};

/**
 * 水温種別ごとのピンの塗り色（#214）。
 * 常温＝緑 / 冷水＝水色。`hot`（温水）は今後追加されない前提のため色分け対象外。
 */
const TEMPERATURE_FILL = {
  cold: '#38bdf8', // sky-400（水色）
  normal: '#14FF31', // 鮮やかな緑
} as const;

/** `cold` / `normal` のどちらにも該当しない場合（`hot` のみ・水温情報なし）の塗り色。 */
const FALLBACK_FILL = '#94a3b8'; // slate-400

interface TemperatureFill {
  /** CSS `background` 値（単色 or 二分割グラデーション）。 */
  background: string;
  /** スクリーンリーダー／ツールチップ向けの水温ラベル。 */
  label: string;
}

/**
 * 給水機の対応水温から、ピンの塗り（と読み上げラベル）を決める。
 * 冷水のみ＝水色 / 常温のみ＝緑 / 両対応＝水色・緑の二分割。
 * `hot` は無視するため、`hot` を含むケースも残りの種別で破綻なく色付けされる。
 */
function getTemperatureFill(
  temperatures: StationWithRelations['temperatures']
): TemperatureFill {
  const hasCold = temperatures.some((t) => t.temperatureType === 'cold');
  const hasNormal = temperatures.some((t) => t.temperatureType === 'normal');

  if (hasCold && hasNormal) {
    return {
      background: `linear-gradient(90deg, ${TEMPERATURE_FILL.cold} 0 50%, ${TEMPERATURE_FILL.normal} 50% 100%)`,
      label: '冷水・常温',
    };
  }
  if (hasCold) return { background: TEMPERATURE_FILL.cold, label: '冷水' };
  if (hasNormal) return { background: TEMPERATURE_FILL.normal, label: '常温' };
  return { background: FALLBACK_FILL, label: '水温情報なし' };
}

interface Props {
  station: StationWithRelations;
  onClick?: (station: StationWithRelations) => void;
}

/**
 * A water-dispenser marker. Rendered (via portal) into a MapLibre Marker's
 * DOM element, anchored so the pointer tip sits on the station coordinate.
 * Visually distinct from the GeolocateControl's blue current-location dot.
 *
 * リング＝ステータス、塗り＝水温種別（#214）の二軸でエンコードする。
 */
export function StationPin({ station, onClick }: Props) {
  const isAvailable = station.status === 'available';
  const temperature = getTemperatureFill(station.temperatures);

  return (
    <button
      type="button"
      onClick={() => onClick?.(station)}
      aria-label={`${station.name}（水温: ${temperature.label}${
        isAvailable ? '' : `・${STATUS_LABEL[station.status]}`
      }）`}
      className="group relative flex cursor-pointer flex-col items-center"
    >
      {/* Badge（塗り＝水温、リング＝ステータス） */}
      <span
        className={cn(
          'flex size-7 items-center justify-center rounded-full text-white shadow-md ring-2 transition-transform group-hover:scale-110',
          STATUS_RING[station.status]
        )}
        style={{ background: temperature.background }}
      >
        <Droplet className="size-3.5 fill-current" aria-hidden="true" />
      </span>
      {/* Pointer tail (tip touches the coordinate via marker anchor 'bottom') */}
      <span
        className={cn(
          '-mt-0.5 size-1.5 rotate-45 rounded-[1px] shadow-md ring-2',
          STATUS_RING[station.status]
        )}
        style={{ background: temperature.background }}
      />
      {/* Hover tooltip */}
      <span className="pointer-events-none absolute bottom-full mb-1 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100">
        {station.name}
        <span className="ml-1 text-slate-300">
          ({temperature.label}
          {isAvailable ? '' : ` / ${STATUS_LABEL[station.status]}`})
        </span>
      </span>
    </button>
  );
}
