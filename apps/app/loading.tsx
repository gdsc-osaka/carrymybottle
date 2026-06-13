import { Skeleton } from '@/components/ui/skeleton';

/**
 * ランディングページのローディング（スケルトンUI）。
 * Hero（TopAppBar + フロストカード + 統計ピル）のレイアウトを模した骨組みを表示する。
 */
export default function Loading() {
  return (
    <div className="min-h-[100dvh] overflow-hidden bg-[#f7f9fb]">
      {/* TopAppBar */}
      <div className="fixed top-0 z-50 h-20 w-full border-b border-white/20 bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-5 md:px-16">
          <div className="flex items-center gap-2">
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="h-6 w-44" />
          </div>
          <Skeleton className="hidden h-10 w-28 rounded-full md:block" />
        </div>
      </div>

      {/* Hero */}
      <div className="flex min-h-[92vh] items-center justify-center px-5 pt-20">
        <div className="flex w-full max-w-2xl flex-col items-center">
          {/* フロストガラスのカード */}
          <div className="w-full rounded-[2rem] border border-white/50 bg-white/40 px-8 py-12 shadow-sm sm:px-14">
            <div className="mb-6 flex justify-center">
              <Skeleton className="size-24 rounded-full" />
            </div>
            <div className="flex flex-col items-center gap-3">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-14 w-64" />
            </div>
            <div className="mx-auto mt-3 mb-6 h-px w-12 bg-[#7fb5ad]/40" />
            <div className="flex flex-col items-center gap-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Skeleton className="h-12 w-full rounded-2xl sm:w-48" />
              <Skeleton className="h-12 w-full rounded-2xl sm:w-40" />
            </div>
          </div>

          {/* 統計ピル */}
          <div className="mt-7 grid w-full max-w-2xl grid-cols-3 gap-4 rounded-3xl border border-white/40 bg-white/30 py-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex flex-col items-center gap-2 px-3">
                <Skeleton className="h-9 w-20" />
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
