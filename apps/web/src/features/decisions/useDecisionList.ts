import { useEffect, useState } from 'react';
import type { DecisionRecordData } from '@piko/domain';

import { listDecisions } from '../../lib/api/decisions';

type DecisionListState =
  | { status: 'loading'; decisions: readonly DecisionRecordData[] }
  | { status: 'loaded'; decisions: readonly DecisionRecordData[] }
  | { status: 'error'; decisions: readonly DecisionRecordData[] };

export function useDecisionList(): DecisionListState {
  const [state, setState] = useState<DecisionListState>({ decisions: [], status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    void listDecisions(controller.signal)
      .then((decisions) => {
        if (!controller.signal.aborted) {
          setState({ decisions, status: 'loaded' });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setState({ decisions: [], status: 'error' });
        }
      });

    return () => controller.abort();
  }, []);

  return state;
}
