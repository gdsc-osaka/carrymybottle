'use client';

import { useEffect } from 'react';
import { cancelFrame, frame, useReducedMotion } from 'motion/react';
import Lenis from 'lenis';

/**
 * Lenis による慣性スムーズスクロール。
 *
 * LP のスクロール演出（framer motion の useScroll / whileInView）と相性が良い
 * ヌルッとした減速スクロールを全体へ付与する。Lenis 1.x はネイティブ scroll を
 * 駆動するため、framer motion 側の useScroll はそのまま機能する。
 *
 * prefers-reduced-motion 時は慣性を無効化し、OS 標準のスクロールに任せる。
 */
export function SmoothScroll() {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;

    const lenis = new Lenis({
      duration: 1.1,
      // ease-out-expo 寄り。終端で滑らかに減速する。
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      wheelMultiplier: 1,
      touchMultiplier: 1.6,
    });

    // Lenis を framer motion のフレームループで駆動する。独立した
    // requestAnimationFrame で回すと、Lenis が scroll を更新するフレームと
    // framer の useScroll が値を読むフレームが 1 フレームずれ、パララックスが
    // カクついて見える。同じループに乗せることで描画と完全同期させる。
    const update = (data: { timestamp: number }) => {
      lenis.raf(data.timestamp);
    };
    frame.update(update, true);

    // ハッシュリンク（#about など）クリック時は Lenis 経由で滑らかに移動する。
    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement)?.closest?.('a[href^="#"]');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href === '#') return;
      const el = document.querySelector(href);
      if (!el) return;
      e.preventDefault();
      lenis.scrollTo(el as HTMLElement, { offset: -80 });
    };
    document.addEventListener('click', onClick);

    return () => {
      cancelFrame(update);
      document.removeEventListener('click', onClick);
      lenis.destroy();
    };
  }, [reduce]);

  return null;
}
