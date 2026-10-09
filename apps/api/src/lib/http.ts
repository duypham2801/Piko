import type { Context } from 'hono';
import { z } from 'zod';
import type { ZodMiniType } from 'zod/mini';

import type { AppEnv } from '../auth/session.middleware.js';
import { HttpError } from './errors.js';

export function notFoundError(): HttpError {
  return new HttpError(404, 'not_found', 'The requested resource was not found.');
}

export function parseUuidParam(value: string): string {
  const result = z.uuid().safeParse(value);
  if (!result.success) {
    throw notFoundError();
  }
  return result.data;
}

export async function readJsonBody<T>(
  c: Context<AppEnv>,
  schema: ZodMiniType<T>,
  invalidBodyMessage: string,
): Promise<T> {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new HttpError(400, 'invalid_json', 'The request body is not valid JSON.');
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    throw new HttpError(400, 'invalid_body', invalidBodyMessage);
  }
  return result.data;
}
