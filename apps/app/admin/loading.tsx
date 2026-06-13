import { Spinner } from '@/components/ui/spinner';

export default function Loading() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50">
      <Spinner className="size-8 text-teal-600" />
    </div>
  );
}
