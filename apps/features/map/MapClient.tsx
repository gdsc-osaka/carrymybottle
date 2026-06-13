'use client';

import { Suspense, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Droplet, Map as MapIcon, Menu, Vote, X } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { CAMPUSES, type CampusId } from '@/lib/constants/campuses';
import type { StationWithRelations } from './types';

/** マップヘッダーのナビゲーションリンク。 */
const NAV_LINKS = [
  { href: '/map', label: 'マップ', icon: MapIcon },
  { href: '/requests', label: '設置リクエスト', icon: Vote },
] as const;

// maplibre-gl is browser-only — load the map client-side only.
const MapLibreMap = dynamic(() => import('./MapLibreMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-muted">
      <Spinner className="size-8 text-[#0f897f]" />
    </div>
  ),
});

function isCampusId(value: string | null): value is CampusId {
  return value !== null && CAMPUSES.some((c) => c.id === value);
}

function MapContent({ stations }: { stations: StationWithRelations[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);

  // URLからcampusパラメータを取得。デフォルトは 'toyonaka'
  const campusParam = searchParams.get('campus');
  const selectedCampusId: CampusId = isCampusId(campusParam)
    ? campusParam
    : 'toyonaka';

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('campus', value);
    // URLを更新して履歴を置き換え（戻るボタンで1つ前のキャンパスに戻したい場合は push を使用）
    router.replace(`${pathname}?${params.toString()}`);
  };

  const selectedCampus = CAMPUSES.find((c) => c.id === selectedCampusId);
  if (!selectedCampus) {
    return null;
  }

  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      {/* Header & Tabs */}
      <header className="relative z-20 flex flex-col gap-3 border-b border-[#0f897f]/10 bg-white/80 px-4 pt-4 pb-3 shadow-sm backdrop-blur-md">
        <div className="relative flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Droplet className="h-6 w-6 fill-[#1f8f87] text-[#1f8f87]" />
            <h1 className="bg-gradient-to-r from-[#0f897f] to-[#1f6fc4] bg-clip-text text-xl font-bold tracking-tight text-transparent">
              給水機マップ
            </h1>
          </div>

          {/* デスクトップ: インラインのナビリンク */}
          <nav className="hidden items-center gap-6 sm:flex">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'text-sm font-medium transition-colors hover:text-[#0f897f]',
                    active ? 'text-[#0f897f]' : 'text-[#3d4947]'
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* モバイル: ハンバーガーメニュー */}
          <button
            type="button"
            aria-label="メニューを開く"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="-mr-1 text-[#0f897f] sm:hidden"
          >
            {menuOpen ? (
              <X className="size-6" aria-hidden="true" />
            ) : (
              <Menu className="size-6" aria-hidden="true" />
            )}
          </button>

          {/* モバイル: 展開メニュー */}
          {menuOpen && (
            <nav className="absolute top-full right-0 z-30 mt-3 flex min-w-44 flex-col overflow-hidden rounded-xl border border-[#0f897f]/15 bg-white shadow-lg sm:hidden">
              {NAV_LINKS.map((link) => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors hover:bg-[#0f897f]/5',
                      active ? 'text-[#0f897f]' : 'text-[#3d4947]'
                    )}
                  >
                    <link.icon className="size-4" aria-hidden="true" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>
        <Tabs
          value={selectedCampusId}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3 rounded-full bg-[#eef2f3] p-1 group-data-horizontal/tabs:h-11">
            {CAMPUSES.map((campus) => (
              <TabsTrigger
                key={campus.id}
                value={campus.id}
                className="rounded-full text-sm font-semibold text-[#5a6b6a] transition-all hover:text-[#0f897f] data-active:bg-gradient-to-r data-active:from-[#0f897f] data-active:to-[#1f6fc4] data-active:text-white data-active:shadow-md data-active:shadow-[#1f6fc4]/25"
              >
                {campus.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </header>

      {/* Map Content Area */}
      <main className="relative flex-1 overflow-hidden bg-muted">
        <MapLibreMap
          campusId={selectedCampusId}
          stations={stations}
          onStationClick={(station) => {
            router.push(`/stations/${station.id}`);
          }}
        />
      </main>
    </div>
  );
}

export function MapClient({ stations }: { stations: StationWithRelations[] }) {
  return (
    <Suspense
      fallback={
        <div className="flex h-[100dvh] items-center justify-center bg-[#f7f9fb]">
          <Spinner className="size-8 text-[#0f897f]" />
        </div>
      }
    >
      <MapContent stations={stations} />
    </Suspense>
  );
}
