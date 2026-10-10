import { useCallback, useEffect, useState } from 'react';
import type { HistoryEntryData } from '@piko/domain';

import { listHistory } from '../../lib/api/history';

type HistoryListState =
  | { status: 'loading'; entries: readonly HistoryEntryData[] }
  | { status: 'loaded'; entries: readonly HistoryEntryData[] }
  | { status: 'error'; entries: readonly HistoryEntryData[] };

export function useHistoryList(
  limit?: number,
  reloadKey?: string,
): HistoryListState & { retry: () => void } {
  const [state, setState] = useState<HistoryListState>({ entries: [], status: 'loading' });
  const [retryCount, setRetryCount] = useState(0);
  const retry = useCallback(() => {
    setState({ entries: [], status: 'loading' });
    setRetryCount((current) => current + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void listHistory({ limit, signal: controller.signal })
      .then((entries) => {
        if (!controller.signal.aborted) {
          setState({ entries, status: 'loaded' });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setState({ entries: [], status: 'error' });
        }
      });

    return () => controller.abort();
  }, [limit, reloadKey, retryCount]);

  return { ...state, retry };
}
