'use client';

import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';

/**
 * 「マイボトルで約10万円節約」を直感的に見せる累積コスト比較チャート。
 *
 * recharts のような汎用ライブラリは使わず、ブランドに馴染む手描きの SVG を
 * framer motion でパス描画する。重い演出はヒーローに限定し、ここはスクロール
 * 進入時に一度だけ線が引かれる軽量なリビールにとどめる。
 */

const VB_W = 640;
const VB_H = 400;
const PAD_L = 56;
const PAD_R = 32;
const PAD_T = 36;
const PAD_B = 56;

const X0 = PAD_L;
const X1 = VB_W - PAD_R;
const Y0 = VB_H - PAD_B; // 0円ライン
const Y1 = PAD_T; // 上限(約10万円)

const MAX_YEN = 100_000;

// 各年の累積コスト（円）。ペットボトルは毎日購入、マイボトルは水道水でほぼ0。
const YEARS = [0, 1, 2, 3, 4];
const PET = [0, 25_000, 50_000, 75_000, 100_000];
const BOTTLE = [0, 1_300, 2_300, 3_300, 4_300];

function x(year: number) {
  return X0 + (year / 4) * (X1 - X0);
}
function y(yen: number) {
  return Y0 - (yen / MAX_YEN) * (Y0 - Y1);
}

function linePath(values: number[]) {
  return values
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(YEARS[i]).toFixed(1)} ${y(v).toFixed(1)}`)
    .join(' ');
}

// 2本の線で囲まれた「差額（＝節約）」の塗り。
function gapAreaPath() {
  const top = PET.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(YEARS[i]).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const bottom = [...BOTTLE]
    .reverse()
    .map((v, i) => `L ${x(YEARS[BOTTLE.length - 1 - i]).toFixed(1)} ${y(v).toFixed(1)}`)
    .join(' ');
  return `${top} ${bottom} Z`;
}

export function SavingsChart() {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduce = useReducedMotion();
  const show = reduce ? true : inView;

  return (
    <figure className="m-0">
      <svg
        ref={ref}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="w-full"
        role="img"
        aria-label="ペットボトルを毎日買い続けた場合とマイボトルを使った場合の、4年間の累積コストを比較したグラフ。差額はおよそ10万円。"
      >
        {/* 横の目盛線 */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const yy = Y0 - t * (Y0 - Y1);
          return (
            <g key={t}>
              <line
                x1={X0}
                x2={X1}
                y1={yy}
                y2={yy}
                stroke="#0c2b29"
                strokeOpacity={0.08}
                strokeWidth={1}
              />
              <text
                x={X0 - 12}
                y={yy + 4}
                textAnchor="end"
                className="fill-[#5a6b6a] text-[11px]"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {t === 0 ? '0' : `${Math.round((t * MAX_YEN) / 10000)}万`}
              </text>
            </g>
          );
        })}

        {/* 差額の塗り（節約分） */}
        <motion.path
          d={gapAreaPath()}
          fill="#0f897f"
          initial={{ opacity: 0 }}
          animate={show ? { opacity: 0.1 } : { opacity: 0 }}
          transition={{ duration: 0.9, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />

        {/* ペットボトル：毎日120円 */}
        <motion.path
          d={linePath(PET)}
          fill="none"
          stroke="#c2683f"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={show ? { pathLength: 1 } : { pathLength: 0 }}
          transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }}
        />
        {/* マイボトル：ほぼ0円 */}
        <motion.path
          d={linePath(BOTTLE)}
          fill="none"
          stroke="#0f897f"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={show ? { pathLength: 1 } : { pathLength: 0 }}
          transition={{ duration: 1.3, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
        />

        {/* 終端のマーカー＋ラベル */}
        <motion.g
          initial={{ opacity: 0, scale: 0.6 }}
          animate={show ? { opacity: 1, scale: 1 } : { opacity: 0 }}
          transition={{ duration: 0.5, delay: 1.25, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformOrigin: `${x(4)}px ${y(PET[4])}px` }}
        >
          <circle cx={x(4)} cy={y(PET[4])} r={5} fill="#c2683f" />
        </motion.g>
        <motion.g
          initial={{ opacity: 0, scale: 0.6 }}
          animate={show ? { opacity: 1, scale: 1 } : { opacity: 0 }}
          transition={{ duration: 0.5, delay: 1.4, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformOrigin: `${x(4)}px ${y(BOTTLE[4])}px` }}
        >
          <circle cx={x(4)} cy={y(BOTTLE[4])} r={5} fill="#0f897f" />
        </motion.g>

        {/* 差額の注釈 */}
        <motion.g
          initial={{ opacity: 0, x: -8 }}
          animate={show ? { opacity: 1, x: 0 } : { opacity: 0 }}
          transition={{ duration: 0.6, delay: 1.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <line
            x1={x(4) + 14}
            x2={x(4) + 14}
            y1={y(PET[4])}
            y2={y(BOTTLE[4])}
            stroke="#0c2b29"
            strokeOpacity={0.35}
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        </motion.g>

        {/* X 軸ラベル */}
        {YEARS.map((yr) => (
          <text
            key={yr}
            x={x(yr)}
            y={Y0 + 26}
            textAnchor="middle"
            className="fill-[#5a6b6a] text-[12px]"
          >
            {yr === 0 ? '開始' : `${yr}年後`}
          </text>
        ))}
      </svg>
    </figure>
  );
}
