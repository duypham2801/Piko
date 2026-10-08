import { ApiError } from '@piko/domain';
import type { ZodMiniType } from 'zod/mini';

export class ApiClientError extends Error {
  public readonly status: number;
  public readonly code: string;

  public constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
  }
}

async function parseResponse<T>(response: Response, schema: ZodMiniType<T>): Promise<T> {
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => undefined);
    const parsed = ApiError.safeParse(body);
    if (parsed.success) {
      throw new ApiClientError(response.status, parsed.data.error.code, parsed.data.error.message);
    }
    throw new ApiClientError(response.status, 'http_error', 'Request failed.');
  }

  return schema.parse(await response.json());
}

export async function apiGet<T>(
  path: string,
  schema: ZodMiniType<T>,
  options?: Pick<RequestInit, 'signal'>,
): Promise<T> {
  const response = await fetch(path, { credentials: 'same-origin', signal: options?.signal });
  return parseResponse(response, schema);
}

export async function apiSend<T>(
  method: 'POST' | 'PUT',
  path: string,
  body: unknown,
  schema: ZodMiniType<T>,
): Promise<T> {
  const response = await fetch(path, {
    body: JSON.stringify(body),
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    method,
  });
  return parseResponse(response, schema);
}
