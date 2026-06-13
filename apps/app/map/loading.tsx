import { Spinner } from '@/components/ui/spinner';

export default function Loading() {
  return (
    <div className="flex h-[100dvh] items-center justify-center bg-[#f7f9fb]">
      <Spinner className="size-8 text-[#0f897f]" />
    </div>
  );
}
