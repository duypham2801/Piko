import {
  SharedCase,
  SharedCaseListResponse,
  type SharedCaseCreateData,
  type SharedCaseData,
  type SharedCaseSpinData,
} from '@piko/domain';

import { apiDelete, apiGet, apiSend } from './client';
import { ensureSession, withSession } from './session';

export async function createShare(input: SharedCaseCreateData): Promise<SharedCaseData> {
  await ensureSession();
  return withSession(() => apiSend('POST', '/api/shares', input, SharedCase));
}

export async function recordShareSpin(
  id: string,
  input: SharedCaseSpinData,
): Promise<SharedCaseData> {
  await ensureSession();
  return withSession(() =>
    apiSend('POST', `/api/shares/${encodeURIComponent(id)}/spins`, input, SharedCase),
  );
}

export function fetchPublicShare(
  id: string,
  options?: { signal?: AbortSignal },
): Promise<SharedCaseData> {
  return apiGet(`/api/public/shares/${encodeURIComponent(id)}`, SharedCase, options);
}

export async function listShares(options?: { signal?: AbortSignal }): Promise<SharedCaseData[]> {
  await ensureSession();
  return withSession(async () => {
    const response = await apiGet('/api/shares', SharedCaseListResponse, options);
    return response.shares;
  });
}

export async function revokeShare(id: string): Promise<void> {
  await ensureSession();
  return withSession(() => apiDelete(`/api/shares/${encodeURIComponent(id)}`));
}
