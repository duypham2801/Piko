import { useCallback, useRef, useState } from 'react';
import type {
  DecisionDraftData,
  DecisionOptionData,
  HistorySourceInputData,
  SelectionResultData,
} from '@piko/domain';

import { createHistoryEntry } from '../../lib/api/history';
import { invalidateHistory } from '../history/useHistoryList';

export type HistorySaveStatus = 'idle' | 'saving' | 'saved' | 'error';

type HistorySaveOptions = {
  source: HistorySourceInputData;
  title: string;
  category?: string;
};

type HistorySaveSnapshot = {
  options: readonly DecisionOptionData[];
  result: SelectionResultData;
};

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

export function useHistorySave({ source, title, category }: HistorySaveOptions) {
  const [status, setStatus] = useState<HistorySaveStatus>('idle');
  const saveRequestRef = useRef(0);

  const reset = useCallback(() => {
    saveRequestRef.current += 1;
    setStatus('idle');
  }, []);

  const save = useCallback(
    async ({ options, result }: HistorySaveSnapshot) => {
      if (status === 'saving' || status === 'saved') {
        return;
      }

      const requestId = saveRequestRef.current + 1;
      saveRequestRef.current = requestId;
      setStatus('saving');

      try {
        await createHistoryEntry({
          source,
          decision: createDecisionSnapshot(category, title, options),
          result,
        });
        if (saveRequestRef.current === requestId) {
          setStatus('saved');
          invalidateHistory();
        }
      } catch {
        if (saveRequestRef.current === requestId) {
          setStatus('error');
        }
      }
    },
    [category, source, status, title],
  );

  return { reset, save, status };
}
