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

export async function apiGet<T>(path: string, schema: ZodMiniType<T>): Promise<T> {
  const response = await fetch(path, { credentials: 'same-origin' });

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
