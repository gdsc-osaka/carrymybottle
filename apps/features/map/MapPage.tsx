'use client';

import React, { Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CAMPUSES, CampusId } from '@/lib/constants/campuses';

function MapContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URLからcampusパラメータを取得。デフォルトは 'toyonaka'
  const campusParam = searchParams.get('campus') as CampusId | null;
  const selectedCampusId: CampusId =
    campusParam && CAMPUSES.some((c) => c.id === campusParam)
      ? campusParam
      : 'toyonaka';

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('campus', value);
    // URLを更新して履歴を置き換え（戻るボタンで1つ前のキャンパスに戻したい場合は push を使用）
    router.replace(`${pathname}?${params.toString()}`);
  };

  const selectedCampus = CAMPUSES.find((c) => c.id === selectedCampusId)!;

  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      {/* Header & Tabs */}
      <header className="flex flex-col gap-3 border-b bg-card p-4 shadow-sm">
        <h1 className="text-xl font-bold">給水機マップ</h1>
        <Tabs value={selectedCampusId} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            {CAMPUSES.map((campus) => (
              <TabsTrigger key={campus.id} value={campus.id}>
                {campus.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </header>

      {/* Map Content Area */}
      <main className="relative flex-1 overflow-hidden bg-muted">
        {/* Placeholder for MapCanvas */}
        <div className="flex h-full w-full items-center justify-center p-4">
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-muted-foreground">
              【Issue #38 実装予定】
              <br />
              ここに MapCanvas コンポーネントが配置されます。
            </p>
            <div className="rounded-lg border bg-background p-4 shadow-sm">
              <p className="font-medium text-foreground">現在の選択キャンパス</p>
              <p className="text-sm text-muted-foreground">
                名前: {selectedCampus.name}
              </p>
              <p className="text-sm text-muted-foreground">
                画像パス: <code className="bg-muted px-1 py-0.5 rounded">{selectedCampus.mapImagePath}</code>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export function MapPage() {
  return (
    <Suspense fallback={<div className="flex h-[100dvh] items-center justify-center">読み込み中...</div>}>
      <MapContent />
    </Suspense>
  );
}
