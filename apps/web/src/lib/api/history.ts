import { HistoryEntry, HistoryListResponse } from '@piko/domain';
import type { HistoryEntryCreateData, HistoryEntryData } from '@piko/domain';

import { apiGet, apiSend } from './client';
import { withSession } from './session';

export async function createHistoryEntry(input: HistoryEntryCreateData): Promise<HistoryEntryData> {
  return withSession(() => apiSend('POST', '/api/history', input, HistoryEntry));
}

export async function listHistory(options?: {
  limit?: number;
  signal?: AbortSignal;
}): Promise<HistoryEntryData[]> {
  const path =
    options?.limit === undefined ? '/api/history' : `/api/history?limit=${options.limit}`;
  return withSession(async () => {
    const response = await apiGet(path, HistoryListResponse, { signal: options?.signal });
    return response.entries;
  });
}
