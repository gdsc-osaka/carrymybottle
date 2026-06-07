interface StationDetailPageProps {
  stationId: string;
}

/**
 * 給水機詳細ページ（Server Component）の骨格。
 *
 * データ取得（#47）、給水機名・キャンパス・建物・説明の表示（#48）、
 * ステータス／水温種別バッジ（#49・#50）、緊急連絡・設置希望への導線（#54・#55）は
 * 後続 Issue で各セクションを埋める形で実装する。
 */
export function StationDetailPage({ stationId }: StationDetailPageProps) {
  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col gap-6 p-4">
      <header className="flex flex-col gap-2">
        <h1 className="text-xl font-bold">給水機詳細</h1>
        {/* #48: 給水機名・キャンパス・建物・説明 */}
        <p className="text-sm text-muted-foreground">Station ID: {stationId}</p>
      </header>

      {/* #49: ステータスバッジ / #50: 水温種別バッジ */}
      <section aria-label="給水機の状態" className="flex flex-wrap gap-2">
        {/* 後続 Issue でバッジを表示 */}
      </section>

      {/* #54: 緊急連絡フォーム / #55: 設置希望画面 への導線 */}
      <section aria-label="アクション" className="mt-auto flex flex-col gap-3">
        {/* 後続 Issue で導線ボタンを表示 */}
      </section>
    </main>
  );
}
