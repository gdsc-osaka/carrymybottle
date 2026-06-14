'use client';

import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Droplet,
  MapPin,
  Trophy,
  Vote,
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { CampusId, CAMPUSES } from '@/lib/constants/campuses';
import { voteInstallationRequestAction } from './actions';
import type { InstallationRequestBuilding } from './queries';

type CampusOption = (typeof CAMPUSES)[number];

interface RequestsPageProps {
  campuses: readonly CampusOption[];
  selectedCampusId: CampusId;
  buildings: InstallationRequestBuilding[];
  loadError?: string;
}

export function RequestsPage({
  campuses,
  selectedCampusId,
  buildings,
  loadError,
}: RequestsPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [isVoting, setIsVoting] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const selectedCampus = campuses.find(
    (campus) => campus.id === selectedCampusId
  );
  const selectedBuilding =
    buildings.find((building) => building.buildingId === selectedBuildingId) ??
    buildings[0];
  const rankedBuildings = useMemo(
    () =>
      [...buildings].sort((a, b) => {
        if (b.voteCount !== a.voteCount) {
          return b.voteCount - a.voteCount;
        }
        return a.buildingName.localeCompare(b.buildingName, 'ja');
      }),
    [buildings]
  );
  const totalVotes = buildings.reduce(
    (sum, building) => sum + building.voteCount,
    0
  );

  function handleCampusChange(value: string) {
    setSelectedBuildingId('');
    setMessage(null);
    router.replace(`${pathname}?campus=${value}`);
  }

  async function handleVote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedBuilding || isVoting) {
      return;
    }

    setIsVoting(true);
    setMessage(null);
    const formData = new FormData(event.currentTarget);

    try {
      const result = await voteInstallationRequestAction(formData);
      if (!result.success) {
        setMessage({ type: 'error', text: result.error });
        return;
      }

      setMessage({
        type: 'success',
        text: `${selectedBuilding.buildingName} に投票しました`,
      });
      router.refresh();
    } catch {
      setMessage({
        type: 'error',
        text: '投票に失敗しました。時間をおいて再試行してください。',
      });
    } finally {
      setIsVoting(false);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-[#f7f9fb] text-foreground">
      <div className="mx-auto w-full max-w-md px-4 py-5 lg:max-w-6xl lg:px-8 lg:py-10">
        <header className="flex flex-col gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="-ml-2 h-11 w-fit text-[#0f897f] hover:bg-[#0f897f]/10 hover:text-[#00685f] sm:h-7"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            戻る
          </Button>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight">
                <Droplet
                  className="size-6 shrink-0 fill-[#1f8f87] text-[#1f8f87]"
                  aria-hidden="true"
                />
                <span className="bg-gradient-to-r from-[#0f897f] to-[#1f6fc4] bg-clip-text text-transparent">
                  設置リクエスト
                </span>
              </h1>
              <p className="mt-1.5 text-xs text-[#5a6b6a]">
                投票で次の給水機の設置場所を決めよう
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1 rounded-full border border-[#0f897f]/25 bg-white px-3 py-2 text-sm font-semibold text-[#00685f] shadow-sm">
              <Vote className="size-4" aria-hidden="true" />
              {totalVotes}票
            </div>
          </div>

          <Tabs
            value={selectedCampusId}
            onValueChange={handleCampusChange}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3 rounded-full bg-[#eef2f3] p-1 group-data-horizontal/tabs:h-12 sm:group-data-horizontal/tabs:h-11">
              {campuses.map((campus) => (
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

        {loadError ? (
          <p
            role="alert"
            className="mt-5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {loadError}
          </p>
        ) : null}

        {/* モバイルは縦積み、PC は「建物選択 + 投票」と「ランキング」の 2 カラム。 */}
        <div className="mt-5 flex flex-col gap-5 lg:mt-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
          <div className="flex flex-col gap-5">
            <section className="rounded-[1.25rem] border border-[#0f897f]/15 bg-white p-3 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <MapPin className="size-4 shrink-0 text-[#0f897f]" />
                  <h2 className="truncate text-base font-semibold">
                    {selectedCampus?.name ?? 'キャンパス'}の建物
                  </h2>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {buildings.length}件
                </Badge>
              </div>

              {buildings.length > 0 ? (
                <div
                  className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 lg:mx-0 lg:flex-wrap lg:overflow-x-visible lg:px-0 lg:pb-0"
                  role="tablist"
                  aria-label="建物を選択"
                >
                  {buildings.map((building) => {
                    const isSelected =
                      selectedBuilding?.buildingId === building.buildingId;
                    return (
                      <button
                        key={building.buildingId}
                        type="button"
                        role="tab"
                        aria-selected={isSelected}
                        onClick={() => {
                          setSelectedBuildingId(building.buildingId);
                          setMessage(null);
                        }}
                        className={cn(
                          'flex min-w-36 shrink-0 flex-col gap-1 rounded-xl border px-3 py-2 text-left shadow-sm transition',
                          isSelected
                            ? 'border-[#0f897f] bg-[#0f897f] text-white'
                            : 'border-[#0f897f]/15 bg-white hover:bg-muted'
                        )}
                      >
                        <span className="line-clamp-2 min-h-10 text-sm font-semibold leading-5">
                          {building.buildingName}
                        </span>
                        <span
                          className={cn(
                            'text-xs',
                            isSelected
                              ? 'text-white/85'
                              : 'text-muted-foreground'
                          )}
                        >
                          {building.voteCount}票
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  建物情報がありません
                </p>
              )}
            </section>

            {selectedBuilding ? (
              <section className="rounded-[1.25rem] border border-[#0f897f]/15 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">
                      選択中の建物
                    </p>
                    <h2 className="mt-1 text-lg font-semibold">
                      {selectedBuilding.buildingName}
                    </h2>
                  </div>
                  <Badge className="shrink-0 bg-[#0f897f] text-white">
                    {selectedBuilding.voteCount}票
                  </Badge>
                </div>

                <form
                  onSubmit={handleVote}
                  className="mt-4 flex flex-col gap-3"
                >
                  <input
                    type="hidden"
                    name="campusId"
                    value={selectedBuilding.campusId}
                  />
                  <input
                    type="hidden"
                    name="buildingId"
                    value={selectedBuilding.buildingId}
                  />
                  {message ? (
                    <p
                      className={cn(
                        'text-sm',
                        message.type === 'success'
                          ? 'flex items-center gap-2 text-[#00685f]'
                          : 'text-destructive'
                      )}
                    >
                      {message.type === 'success' ? (
                        <CheckCircle2 className="size-4" aria-hidden="true" />
                      ) : null}
                      {message.text}
                    </p>
                  ) : null}
                  <Button
                    type="submit"
                    size="lg"
                    className="h-12 w-full bg-gradient-to-r from-[#0f897f] to-[#1f6fc4] text-base text-white shadow-md shadow-[#1f6fc4]/25 hover:opacity-90 sm:h-9 sm:text-sm"
                    disabled={isVoting}
                  >
                    <Vote className="size-4" aria-hidden="true" />
                    {isVoting ? '投票中...' : 'この建物に投票する'}
                  </Button>
                </form>
              </section>
            ) : null}
          </div>

          <section className="rounded-[1.25rem] border border-[#0f897f]/15 bg-white p-4 shadow-sm lg:sticky lg:top-10">
            <div className="mb-3 flex items-center gap-2">
              <Trophy className="size-4 text-[#0f897f]" aria-hidden="true" />
              <h2 className="text-base font-semibold">現在のリクエスト状況</h2>
            </div>

            <div className="divide-y">
              {rankedBuildings.map((building, index) => (
                <button
                  key={building.buildingId}
                  type="button"
                  onClick={() => {
                    setSelectedBuildingId(building.buildingId);
                    setMessage(null);
                  }}
                  className="flex w-full items-center gap-3 py-3 text-left"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#f7f9fb] text-sm font-semibold text-[#00685f]">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 font-medium">
                      <Building2
                        className="size-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <span className="truncate">{building.buildingName}</span>
                    </span>
                  </span>
                  <Badge variant="outline" className="shrink-0">
                    {building.voteCount}票
                  </Badge>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
