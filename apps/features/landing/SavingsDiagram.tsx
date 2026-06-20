'use client';

import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';

/**
 * 「マイボトルは約2ヶ月で元が取れ、4年で約10万円の節約になる」を伝える図。
 *
 * もとは ChatGPT 製のラスター画像で挿入していたが、LP のエディトリアルな
 * トーンと画風が噛み合わず浮いていた。そこで図の内容（2本の出費ライン、
 * 損益分岐の吹き出し、節約幅の矢印）はそのままに、ブランドのフォント・配色・
 * モーションでネイティブ SVG として描き直す。全要素を viewBox 内に置くので
 * 文字も含めて崩れずスケールする。演出はスクロール進入時の一度きりに限定。
 */

const EASE = [0.22, 1, 0.36, 1] as const;

// 配色（LP のトークンに合わせる）
const INK = '#0c2b29';
const SUBINK = '#5a6b6a';
const TEAL = '#0f897f';
const GRAPHITE = '#a7b1af'; // ペットボトル線：割高な選択肢を控えめなグラファイトで
const ACCENT = '#d4724a'; // 節約幅のアクセント（元画像のコーラルを上品に）
const MINT = '#9fe6d8'; // 数字のハイライト

// 幾何（viewBox 800 x 480）
const AX_X = 70; // 縦軸 x
const AX_Y = 416; // 横軸 y（=出費0）
// ペットボトル：原点から右肩上がり
const PET_A = { x: AX_X, y: AX_Y };
const PET_B = { x: 720, y: 104 };
// マイボトル：ボトル代の初期費用ぶんだけ上げて、ほぼ横ばい
const BOT_A = { x: AX_X, y: 388 };
const BOT_B = { x: 720, y: 380 };

export function SavingsDiagram() {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduce = useReducedMotion();
  const show = reduce ? true : inView;

  const draw = {
    initial: { pathLength: 0, opacity: 0 },
    animate: show
      ? { pathLength: 1, opacity: 1 }
      : { pathLength: 0, opacity: 0 },
  };

  return (
    <svg
      ref={ref}
      viewBox="0 0 800 480"
      className="h-auto w-full"
      role="img"
      aria-label="出費の推移グラフ。100円のペットボトルを毎日購入すると出費は右肩上がりに増え、毎日マイボトルを使えばほぼ横ばい。マイボトルは約2ヶ月で元が取れ、4年間で約10万円の節約になる。"
    >
      {/* ── 軸 ── */}
      <g stroke={INK} strokeOpacity={0.55} strokeWidth={2.5} strokeLinecap="round">
        <line x1={AX_X} y1={AX_Y} x2={AX_X} y2={58} />
        <line x1={AX_X} y1={AX_Y} x2={762} y2={AX_Y} />
      </g>
      {/* 軸の矢じり */}
      <path d={`M${AX_X} 50 l-6 12 h12 z`} fill={INK} fillOpacity={0.55} />
      <path d={`M770 ${AX_Y} l-12 -6 v12 z`} fill={INK} fillOpacity={0.55} />

      {/* 軸ラベル */}
      <text x={AX_X - 14} y={64} textAnchor="end" fontSize={22} fontWeight={700} fill={INK}>
        出費
      </text>
      <text x={760} y={AX_Y + 30} textAnchor="end" fontSize={22} fontWeight={700} fill={INK}>
        日数
      </text>

      {/* ── 節約幅の塗り（2線のあいだ） ── */}
      <motion.path
        d={`M${BOT_A.x} ${BOT_A.y} L${BOT_B.x} ${BOT_B.y} L${PET_B.x} ${PET_B.y} L${PET_A.x} ${PET_A.y} Z`}
        fill={TEAL}
        initial={{ opacity: 0 }}
        animate={show ? { opacity: 0.08 } : { opacity: 0 }}
        transition={{ duration: 0.8, delay: 1.0, ease: EASE }}
      />

      {/* ── ペットボトル線 ── */}
      <motion.path
        d={`M${PET_A.x} ${PET_A.y} L${PET_B.x} ${PET_B.y}`}
        fill="none"
        stroke={GRAPHITE}
        strokeWidth={5}
        strokeLinecap="round"
        initial={draw.initial}
        animate={draw.animate}
        transition={{ duration: 1.3, ease: EASE }}
      />
      {/* ── マイボトル線 ── */}
      <motion.path
        d={`M${BOT_A.x} ${BOT_A.y} L${BOT_B.x} ${BOT_B.y}`}
        fill="none"
        stroke={TEAL}
        strokeWidth={5}
        strokeLinecap="round"
        initial={draw.initial}
        animate={draw.animate}
        transition={{ duration: 1.1, delay: 0.3, ease: EASE }}
      />

      {/* 終端ドット */}
      <motion.circle
        cx={PET_B.x}
        cy={PET_B.y}
        r={7}
        fill={GRAPHITE}
        initial={{ scale: 0, opacity: 0 }}
        animate={show ? { scale: 1, opacity: 1 } : { scale: 0 }}
        transition={{ duration: 0.4, delay: 1.25, ease: EASE }}
        style={{ transformOrigin: `${PET_B.x}px ${PET_B.y}px` }}
      />
      <motion.circle
        cx={BOT_B.x}
        cy={BOT_B.y}
        r={7}
        fill={TEAL}
        initial={{ scale: 0, opacity: 0 }}
        animate={show ? { scale: 1, opacity: 1 } : { scale: 0 }}
        transition={{ duration: 0.4, delay: 1.1, ease: EASE }}
        style={{ transformOrigin: `${BOT_B.x}px ${BOT_B.y}px` }}
      />

      {/* ── 線ラベル ── */}
      <motion.text
        x={420}
        y={150}
        fontSize={18}
        fontWeight={600}
        fill={SUBINK}
        initial={{ opacity: 0 }}
        animate={show ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.6, delay: 1.0, ease: EASE }}
      >
        100円のペットボトルを毎日購入
      </motion.text>
      <motion.text
        x={250}
        y={372}
        fontSize={18}
        fontWeight={700}
        fill={TEAL}
        initial={{ opacity: 0 }}
        animate={show ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.6, delay: 0.9, ease: EASE }}
      >
        毎日マイボトルを利用
      </motion.text>

      {/* ── 損益分岐の吹き出し（約2ヶ月で元が取れる） ── */}
      <motion.g
        initial={{ opacity: 0, y: 8 }}
        animate={show ? { opacity: 1, y: 0 } : { opacity: 0 }}
        transition={{ duration: 0.6, delay: 1.4, ease: EASE }}
      >
        <rect x={148} y={230} width={208} height={72} rx={18} fill="#e3f3ef" />
        {/* 損益分岐点（左下）へ向かう吹き出しの尾 */}
        <path d="M196 300 l-30 30 l34 -8 z" fill="#e3f3ef" />
        <text x={252} y={276} textAnchor="middle" fontSize={23} fontWeight={700} fill={INK}>
          約
          <tspan fontSize={30} fill={TEAL}>
            2ヶ月
          </tspan>
          で元が取れる
        </text>
      </motion.g>

      {/* ── 節約幅の矢印（コーラル、右端） ── */}
      <motion.g
        initial={{ opacity: 0, scaleY: 0 }}
        animate={show ? { opacity: 1, scaleY: 1 } : { opacity: 0 }}
        transition={{ duration: 0.6, delay: 1.5, ease: EASE }}
        style={{ transformOrigin: `744px ${(PET_B.y + BOT_B.y) / 2}px` }}
      >
        <line
          x1={744}
          y1={PET_B.y + 6}
          x2={744}
          y2={BOT_B.y - 6}
          stroke={ACCENT}
          strokeWidth={3}
        />
        <path d={`M744 ${PET_B.y} l-6 12 h12 z`} fill={ACCENT} />
        <path d={`M744 ${BOT_B.y} l-6 -12 h12 z`} fill={ACCENT} />
      </motion.g>

      {/* ── 節約額（中央の余白に） ── */}
      <motion.g
        initial={{ opacity: 0, y: 10 }}
        animate={show ? { opacity: 1, y: 0 } : { opacity: 0 }}
        transition={{ duration: 0.7, delay: 1.6, ease: EASE }}
      >
        <text x={430} y={262} fontSize={22} fontWeight={600} fill={SUBINK}>
          4年間で
        </text>
        {/* ハイライト */}
        <motion.rect
          x={426}
          y={284}
          width={300}
          height={22}
          rx={7}
          fill={MINT}
          fillOpacity={0.6}
          initial={{ scaleX: 0 }}
          animate={show ? { scaleX: 1 } : { scaleX: 0 }}
          transition={{ duration: 0.6, delay: 2.0, ease: EASE }}
          style={{ transformOrigin: '426px 295px' }}
        />
        <text
          x={430}
          y={306}
          fontSize={46}
          fontWeight={800}
          fill={INK}
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          約100,000円
        </text>
        <text x={566} y={348} fontSize={26} fontWeight={700} fill={ACCENT}>
          の節約に！
        </text>
      </motion.g>
    </svg>
  );
}
