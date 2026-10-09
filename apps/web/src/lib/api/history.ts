import { HistoryEntry } from '@piko/domain';
import type { HistoryEntryCreateData, HistoryEntryData } from '@piko/domain';

import { apiSend } from './client';
import { ensureSession, withSession } from './session';

export async function createHistoryEntry(input: HistoryEntryCreateData): Promise<HistoryEntryData> {
  await ensureSession();
  return withSession(() => apiSend('POST', '/api/history', input, HistoryEntry));
}
