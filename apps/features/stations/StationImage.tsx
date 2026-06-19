'use client';

import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type Props = {
  src: string;
  alt: string;
  /** 画像の幅・高さ（px）。両方あれば aspect-ratio で枠を確保し CLS を防ぐ。 */
  width: number | null;
  height: number | null;
  /** 外側コンテナへ付与する追加クラス（余白など）。 */
  className?: string;
};

/** 角丸・枠線（スケルトンと画像で共通）。 */
const FRAME = 'overflow-hidden rounded-2xl border border-[#0f897f]/10';

/**
 * 給水機写真の表示。寸法が分かっている場合は aspect-ratio で枠を先に確保し、
 * ロード完了までスケルトンを表示する。これにより画像ロード時のレイアウトシフト
 * （給水機名がガクッと下がる現象）を防ぐ。配信は公開バケット直リンクのため、
 * Cloudflare 固有の最適化に依存しない素の img を使う（AGENTS.md / Next.js 16）。
 */
export function StationImage({ src, alt, width, height, className }: Props) {
  const [loaded, setLoaded] = useState(false);

  // 寸法不明（旧データ）はフォールバック：縦横比のまま全体表示（枠確保なし）。
  if (!width || !height) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={cn('h-auto w-full', FRAME, className)}
      />
    );
  }

  return (
    <div
      className={cn('relative w-full', FRAME, className)}
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      {/* ロード中はスケルトンを背面に表示。画像（z 上）がロードされると覆われ、
          onLoad で取り外す。onLoad が発火しない（キャッシュ等）場合でも、画像が
          上に描画されてスケルトンを覆うため表示は壊れない。 */}
      {!loaded && (
        <Skeleton className="absolute inset-0 h-full w-full rounded-none" />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        onLoad={() => setLoaded(true)}
        className="absolute inset-0 h-full w-full object-cover"
      />
    </div>
  );
}
