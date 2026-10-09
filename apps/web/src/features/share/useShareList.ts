import { useCallback, useEffect, useState } from 'react';
import type { SharedCaseData } from '@piko/domain';

import { listShares } from '../../lib/api/shares';

type ShareListState =
  | { status: 'loading'; shares: readonly SharedCaseData[] }
  | { status: 'loaded'; shares: readonly SharedCaseData[] }
  | { status: 'error'; shares: readonly SharedCaseData[] };

export function useShareList(): ShareListState & { removeShare: (id: string) => void } {
  const [state, setState] = useState<ShareListState>({ shares: [], status: 'loading' });
  const removeShare = useCallback((id: string) => {
    setState((current) => ({
      ...current,
      shares: current.shares.filter((share) => share.id !== id),
    }));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void listShares({ signal: controller.signal })
      .then((shares) => {
        if (!controller.signal.aborted) {
          setState({ shares, status: 'loaded' });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setState({ shares: [], status: 'error' });
        }
      });

    return () => controller.abort();
  }, []);

  return { ...state, removeShare };
}
