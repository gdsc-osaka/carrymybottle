'use client';

import { useMemo, useState } from 'react';
import { Building2, CheckCircle2, MapPin, Trophy, Vote } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
    <main className="min-h-[100dvh] bg-[#f8fafa] text-foreground">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-5">
        <header className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-[#2f7781]">
                Mizu-Path Osaka
              </p>
              <h1 className="text-2xl font-bold tracking-normal">
                設置希望の投票
              </h1>
            </div>
            <div className="flex shrink-0 items-center gap-1 rounded-lg border border-[#429eab]/25 bg-white px-3 py-2 text-sm font-semibold text-[#2f7781] shadow-sm">
              <Vote className="size-4" aria-hidden="true" />
              {totalVotes}票
            </div>
          </div>

          <Tabs
            value={selectedCampusId}
            onValueChange={handleCampusChange}
            className="w-full"
          >
            <TabsList className="grid h-10 w-full grid-cols-3 bg-white shadow-sm">
              {campuses.map((campus) => (
                <TabsTrigger
                  key={campus.id}
                  value={campus.id}
                  className="text-sm data-active:bg-[#429eab] data-active:text-white"
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
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {loadError}
          </p>
        ) : null}

        <section className="rounded-lg border bg-white p-3 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <MapPin className="size-4 shrink-0 text-[#429eab]" />
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
              className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1"
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
                    className={[
                      'flex min-w-36 shrink-0 flex-col gap-1 rounded-lg border px-3 py-2 text-left shadow-sm transition',
                      isSelected
                        ? 'border-[#429eab] bg-[#429eab] text-white'
                        : 'border-border bg-white hover:bg-muted',
                    ].join(' ')}
                  >
                    <span className="line-clamp-2 min-h-10 text-sm font-semibold leading-5">
                      {building.buildingName}
                    </span>
                    <span
                      className={
                        isSelected
                          ? 'text-xs text-white/85'
                          : 'text-xs text-muted-foreground'
                      }
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
          <section className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">
                  選択中の建物
                </p>
                <h2 className="mt-1 text-lg font-semibold">
                  {selectedBuilding.buildingName}
                </h2>
              </div>
              <Badge className="shrink-0 bg-[#429eab] text-white">
                {selectedBuilding.voteCount}票
              </Badge>
            </div>

            <form onSubmit={handleVote} className="mt-4 flex flex-col gap-3">
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
                  className={
                    message.type === 'success'
                      ? 'flex items-center gap-2 text-sm text-[#2f7781]'
                      : 'text-sm text-destructive'
                  }
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
                className="w-full bg-[#429eab] text-white hover:bg-[#2f7781]"
                disabled={isVoting}
              >
                <Vote className="size-4" aria-hidden="true" />
                {isVoting ? '投票中...' : 'この建物に投票する'}
              </Button>
            </form>
          </section>
        ) : null}

        <section className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Trophy className="size-4 text-[#429eab]" aria-hidden="true" />
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
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#f8fafa] text-sm font-semibold text-[#2f7781]">
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
    </main>
  );
}
