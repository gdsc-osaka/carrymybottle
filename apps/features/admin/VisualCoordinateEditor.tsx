'use client';

import { useRef, useState } from 'react';
import type { Campus } from '@/lib/db/types';

interface Props {
  campus: Campus | undefined;
  relativeX: number;
  relativeY: number;
  onCoordinateChange: (x: number, y: number) => void;
}

export function VisualCoordinateEditor({
  campus,
  relativeX,
  relativeY,
  onCoordinateChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hovering, setHovering] = useState(false);

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    onCoordinateChange(
      Math.round(x * 1000) / 1000,
      Math.round(y * 1000) / 1000
    );
  }

  if (!campus?.mapImagePath) {
    return (
      <div className="flex items-center justify-center h-40 bg-muted rounded border text-sm text-muted-foreground">
        キャンパスを選択すると地図が表示されます
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        地図上をクリックして座標を設定してください（クリック位置にピンが移動します）
      </p>
      <div
        ref={containerRef}
        className="relative w-full cursor-crosshair border rounded overflow-hidden select-none"
        style={{
          aspectRatio:
            campus.mapWidth && campus.mapHeight
              ? `${campus.mapWidth}/${campus.mapHeight}`
              : '16/9',
        }}
        onClick={handleClick}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={campus.mapImagePath}
          alt="キャンパス地図"
          className="w-full h-full object-contain pointer-events-none"
          draggable={false}
        />
        <div
          className="absolute w-5 h-5 -translate-x-1/2 -translate-y-full pointer-events-none"
          style={{ left: `${relativeX * 100}%`, top: `${relativeY * 100}%` }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="text-destructive drop-shadow"
          >
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
          </svg>
        </div>
        {hovering && (
          <div className="absolute inset-0 bg-black/5 pointer-events-none" />
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        X: {relativeX.toFixed(3)} / Y: {relativeY.toFixed(3)}
      </p>
    </div>
  );
}
