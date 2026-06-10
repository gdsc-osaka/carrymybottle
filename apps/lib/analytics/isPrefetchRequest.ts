import { headers } from 'next/headers';

export async function isPrefetchRequest(): Promise<boolean> {
  const h = await headers();
  return (
    h.get('next-router-prefetch') === '1' ||
    (h.get('sec-purpose')?.startsWith('prefetch') ?? false)
  );
}
