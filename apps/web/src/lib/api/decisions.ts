import {
  DecisionListResponse,
  DecisionRecord,
  type DecisionDraftData,
  type DecisionRecordData,
} from '@piko/domain';

import { ApiClientError, apiDelete, apiGet, apiSend } from './client';
import { ensureSession, resetSession } from './session';

async function withSession<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch (error) {
    if (
      error instanceof ApiClientError &&
      error.status === 401 &&
      error.code === 'session_required'
    ) {
      resetSession();
      await ensureSession();
      return request();
    }
    throw error;
  }
}

export async function fetchDecision(id: string, signal?: AbortSignal): Promise<DecisionRecordData> {
  await ensureSession();
  return withSession(() =>
    apiGet(`/api/decisions/${encodeURIComponent(id)}`, DecisionRecord, { signal }),
  );
}

export async function createDecision(draft: DecisionDraftData): Promise<DecisionRecordData> {
  await ensureSession();
  return withSession(() => apiSend('POST', '/api/decisions', draft, DecisionRecord));
}

export async function updateDecision(
  id: string,
  draft: DecisionDraftData,
): Promise<DecisionRecordData> {
  await ensureSession();
  return withSession(() =>
    apiSend('PUT', `/api/decisions/${encodeURIComponent(id)}`, draft, DecisionRecord),
  );
}

export async function listDecisions(signal?: AbortSignal): Promise<DecisionRecordData[]> {
  await ensureSession();
  return withSession(async () => {
    const response = await apiGet('/api/decisions', DecisionListResponse, { signal });
    return response.decisions;
  });
}

export async function deleteDecision(id: string): Promise<void> {
  await ensureSession();
  return withSession(() => apiDelete(`/api/decisions/${encodeURIComponent(id)}`));
}
