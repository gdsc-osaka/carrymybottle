interface StationDetailPageProps {
  stationId: string;
}

export function StationDetailPage({ stationId }: StationDetailPageProps) {
  // Issue #46 以降で給水機詳細の表示・データ取得を実装する。
  // 現時点では route adapter (#45) から受け取った stationId を確認できる骨格のみ。
  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col gap-4 p-4">
      <h1 className="text-xl font-bold">給水機詳細</h1>
      <p className="text-sm text-muted-foreground">Station ID: {stationId}</p>
    </main>
  );
}
