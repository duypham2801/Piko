import { useSyncExternalStore } from 'react';
import type { DecisionRecordData } from '@piko/domain';

import { listDecisions } from '../../lib/api/decisions';
import { createListStore } from '../../lib/listStore';

type DecisionListState =
  | { status: 'loading'; decisions: readonly DecisionRecordData[] }
  | { status: 'loaded'; decisions: readonly DecisionRecordData[] }
  | { status: 'error'; decisions: readonly DecisionRecordData[] };

const decisionStore = createListStore(() => listDecisions());

export function useDecisionList(): DecisionListState {
  const snapshot = useSyncExternalStore(decisionStore.subscribe, decisionStore.getSnapshot);
  return { decisions: snapshot.items, status: snapshot.status };
}

export function invalidateDecisions(): void {
  decisionStore.invalidate();
}
