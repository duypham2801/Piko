import { MeResponse } from '@piko/domain';
import type { MeResponseData } from '@piko/domain';

import { apiGet } from './client';

let sessionPromise: Promise<MeResponseData> | null = null;

export function ensureSession(): Promise<MeResponseData> {
  if (sessionPromise) return sessionPromise;

  const request = apiGet('/api/me', MeResponse);
  const memoizedRequest = request.catch((error: unknown) => {
    if (sessionPromise === memoizedRequest) sessionPromise = null;
    throw error;
  });
  sessionPromise = memoizedRequest;
  return memoizedRequest;
}

export function resetSession(): void {
  sessionPromise = null;
}
