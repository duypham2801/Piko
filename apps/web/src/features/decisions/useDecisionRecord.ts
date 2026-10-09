import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import { DecisionRecord, type DecisionRecordData } from '@piko/domain';

import { ApiClientError } from '../../lib/api/client';
import { fetchDecision } from '../../lib/api/decisions';

export type DecisionRecordLoadState =
  | { status: 'loading' }
  | { status: 'loaded'; record: DecisionRecordData }
  | { status: 'notFound' }
  | { status: 'error'; retry: () => void };

type InternalLoadState = {
  id: string | undefined;
  state: DecisionRecordLoadState;
};

export function useDecisionRecord(id: string | undefined): DecisionRecordLoadState {
  const location = useLocation();
  const [retryCount, setRetryCount] = useState(0);
  const stateRecord = useMemo(() => {
    if (!id || !location.state || typeof location.state !== 'object') {
      return undefined;
    }

    const state = location.state as { record?: unknown };
    const parsed = DecisionRecord.safeParse(state.record);
    return parsed.success && parsed.data.decision.id === id ? parsed.data : undefined;
  }, [id, location.state]);
  const [internal, setInternal] = useState<InternalLoadState>(() => ({
    id,
    state: stateRecord ? { record: stateRecord, status: 'loaded' } : { status: 'loading' },
  }));

  useEffect(() => {
    if (!id) {
      return;
    }

    const controller = new AbortController();
    void fetchDecision(id, controller.signal)
      .then((record) => {
        if (!controller.signal.aborted) {
          setInternal({ id, state: { record, status: 'loaded' } });
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        if (error instanceof ApiClientError && error.status === 404) {
          setInternal({ id, state: { status: 'notFound' } });
        } else if (stateRecord) {
          setInternal({ id, state: { record: stateRecord, status: 'loaded' } });
        } else {
          setInternal({
            id,
            state: {
              retry: () => setRetryCount((count) => count + 1),
              status: 'error',
            },
          });
        }
      });

    return () => controller.abort();
  }, [id, retryCount, stateRecord]);

  const retry = useCallback(() => setRetryCount((count) => count + 1), []);
  if (internal.id !== id) {
    return stateRecord ? { record: stateRecord, status: 'loaded' } : { status: 'loading' };
  }

  if (internal.state.status === 'error') {
    return { retry, status: 'error' };
  }

  return internal.state;
}
