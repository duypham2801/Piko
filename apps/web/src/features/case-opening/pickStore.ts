import { useSyncExternalStore } from 'react';
import type {
  DecisionDraftData,
  DecisionOptionData,
  HistoryEntryCreateData,
  HistorySourceInputData,
} from '@piko/domain';

import { createHistoryEntry } from '../../lib/api/history';
import { invalidateHistory } from '../history/useHistoryList';

export type Pick = {
  source: HistorySourceInputData;
  entry: HistoryEntryCreateData;
  winner: DecisionOptionData;
  pickedAt: string;
  status: 'saving' | 'saved' | 'error';
};

const listeners = new Set<() => void>();
let currentPick: Pick | null = null;
let generation = 0;

function emit(nextPick: Pick | null): void {
  currentPick = nextPick;
  listeners.forEach((listener) => listener());
}

function sameSource(first: HistorySourceInputData, second: HistorySourceInputData): boolean {
  if (first.kind !== second.kind) {
    return false;
  }
  if (first.kind === 'draft') {
    return true;
  }
  if (first.kind === 'decision' && second.kind === 'decision') {
    return first.decisionId === second.decisionId;
  }
  return first.kind === 'preset' && second.kind === 'preset' && first.slug === second.slug;
}

async function savePick(pick: Pick, requestGeneration: number): Promise<void> {
  try {
    await createHistoryEntry(pick.entry);
    if (requestGeneration !== generation) {
      return;
    }

    emit({ ...pick, status: 'saved' });
    invalidateHistory();
  } catch {
    if (requestGeneration === generation) {
      emit({ ...pick, status: 'error' });
    }
  }
}

export function createDecisionSnapshot(
  category: string | undefined,
  title: string,
  options: readonly DecisionOptionData[],
): DecisionDraftData {
  return {
    ...(category === undefined ? {} : { category }),
    options: [...options],
    title,
  };
}

export function startPick(entry: HistoryEntryCreateData, winner: DecisionOptionData): void {
  const pick: Pick = {
    entry,
    pickedAt: new Date().toISOString(),
    source: entry.source,
    status: 'saving',
    winner,
  };
  const requestGeneration = ++generation;
  emit(pick);
  void savePick(pick, requestGeneration);
}

export function retryPick(): void {
  if (!currentPick || currentPick.status !== 'error') {
    return;
  }

  const pick = { ...currentPick, status: 'saving' as const };
  const requestGeneration = ++generation;
  emit(pick);
  void savePick(pick, requestGeneration);
}

export function usePick(source: HistorySourceInputData): Pick | null {
  const pick = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => currentPick,
  );

  return pick && sameSource(pick.source, source) ? pick : null;
}
