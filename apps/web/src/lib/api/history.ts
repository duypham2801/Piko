import { HistoryEntry, HistoryListResponse } from '@piko/domain';
import type { HistoryEntryCreateData, HistoryEntryData } from '@piko/domain';

import { apiGet, apiSend } from './client';
import { ensureSession, withSession } from './session';

export async function createHistoryEntry(input: HistoryEntryCreateData): Promise<HistoryEntryData> {
  await ensureSession();
  return withSession(() => apiSend('POST', '/api/history', input, HistoryEntry));
}

export async function listHistory(options?: {
  limit?: number;
  signal?: AbortSignal;
}): Promise<HistoryEntryData[]> {
  await ensureSession();
  const path =
    options?.limit === undefined ? '/api/history' : `/api/history?limit=${options.limit}`;
  return withSession(async () => {
    const response = await apiGet(path, HistoryListResponse, { signal: options?.signal });
    return response.entries;
  });
}
