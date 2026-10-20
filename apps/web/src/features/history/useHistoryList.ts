import { useSyncExternalStore } from 'react';
import type { HistoryEntryData } from '@piko/domain';

import { listHistory } from '../../lib/api/history';
import { createListStore } from '../../lib/listStore';

type HistoryListState =
  | { status: 'loading'; entries: readonly HistoryEntryData[] }
  | { status: 'loaded'; entries: readonly HistoryEntryData[] }
  | { status: 'error'; entries: readonly HistoryEntryData[] };

const recentHistoryStore = createListStore(() => listHistory({ limit: 5 }));
const fullHistoryStore = createListStore(() => listHistory());

export function useHistoryList(limit?: 5): HistoryListState & { retry: () => void } {
  const store = limit === 5 ? recentHistoryStore : fullHistoryStore;
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
  return { entries: snapshot.items, retry: store.retry, status: snapshot.status };
}

export function invalidateHistory(): void {
  recentHistoryStore.invalidate();
  fullHistoryStore.invalidate();
}
