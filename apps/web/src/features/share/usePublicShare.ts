import { useCallback, useEffect, useState } from 'react';
import type { SharedCaseData } from '@piko/domain';

import { ApiClientError } from '../../lib/api/client';
import { fetchPublicShare } from '../../lib/api/shares';

export type PublicShareLoadState =
  | { status: 'loading' }
  | { status: 'loaded'; share: SharedCaseData }
  | { status: 'notFound' }
  | { status: 'error'; retry: () => void };

type InternalLoadState = {
  id: string | undefined;
  state: Exclude<PublicShareLoadState, { status: 'error' }> | { status: 'error' };
};

export function usePublicShare(id: string | undefined): PublicShareLoadState {
  const [retryCount, setRetryCount] = useState(0);
  const [internal, setInternal] = useState<InternalLoadState>(() => ({
    id,
    state: id ? { status: 'loading' } : { status: 'notFound' },
  }));

  useEffect(() => {
    if (!id) {
      return;
    }

    const controller = new AbortController();
    void fetchPublicShare(id, { signal: controller.signal })
      .then((share) => {
        if (!controller.signal.aborted) {
          setInternal({ id, state: { share, status: 'loaded' } });
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setInternal({
          id,
          state:
            error instanceof ApiClientError && error.status === 404
              ? { status: 'notFound' }
              : { status: 'error' },
        });
      });

    return () => controller.abort();
  }, [id, retryCount]);

  const retry = useCallback(() => {
    setInternal({ id, state: { status: 'loading' } });
    setRetryCount((count) => count + 1);
  }, [id]);

  if (internal.id !== id) {
    return id ? { status: 'loading' } : { status: 'notFound' };
  }

  if (internal.state.status === 'error') {
    return { retry, status: 'error' };
  }

  return internal.state;
}
