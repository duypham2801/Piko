import {
  SharedCase,
  type SharedCaseCreateData,
  type SharedCaseData,
  type SharedCaseSpinData,
} from '@piko/domain';

import { apiGet, apiSend } from './client';
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
