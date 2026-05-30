import { useState, useCallback } from 'react';

export function useAsyncAction() {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (id: string, action: () => Promise<void>, errorMsg: string) => {
      if (processingId) return;
      setError(null);
      setProcessingId(id);
      try {
        await action();
      } catch {
        setError(errorMsg);
      } finally {
        setProcessingId(null);
      }
    },
    [processingId]
  );

  return { processingId, error, run };
}
