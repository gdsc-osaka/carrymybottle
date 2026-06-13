'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Droplet } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CAMPUSES, type CampusId } from '@/lib/constants/campuses';
import type { StationWithRelations } from './types';

// maplibre-gl is browser-only — load the map client-side only.
const MapLibreMap = dynamic(() => import('./MapLibreMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-muted" />,
});

function isCampusId(value: string | null): value is CampusId {
  return value !== null && CAMPUSES.some((c) => c.id === value);
}

function MapContent({ stations }: { stations: StationWithRelations[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
      <header className="z-10 flex flex-col gap-3 border-b border-[#0f897f]/10 bg-white/80 px-4 pt-4 pb-3 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Droplet className="h-6 w-6 fill-[#1f8f87] text-[#1f8f87]" />
          <h1 className="bg-gradient-to-r from-[#0f897f] to-[#1f6fc4] bg-clip-text text-xl font-bold tracking-tight text-transparent">
            給水機マップ
          </h1>
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
        <div className="flex h-[100dvh] items-center justify-center">
          読み込み中...
        </div>
      }
    >
      <MapContent stations={stations} />
    </Suspense>
  );
}
