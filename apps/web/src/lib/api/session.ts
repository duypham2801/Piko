import { MeResponse } from '@piko/domain';
import type { MeResponseData } from '@piko/domain';

import { ApiClientError, apiGet } from './client';

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

export async function withSession<T>(request: () => Promise<T>): Promise<T> {
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
