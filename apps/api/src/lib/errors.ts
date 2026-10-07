import { HTTPException } from 'hono/http-exception';
import type { ErrorHandler, NotFoundHandler } from 'hono';

import type { AppEnv } from '../auth/session.middleware.js';

export class HttpError extends Error {
  public readonly status: number;
  public readonly code: string;

  public constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
  }
}

type NodeEnv = 'development' | 'production' | 'test';

function errorResponse(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { 'content-type': 'application/json; charset=UTF-8' },
  });
}

export function createOnError(nodeEnv: NodeEnv): ErrorHandler<AppEnv> {
  return (error, c) => {
    if (error instanceof HttpError) {
      if (error.status >= 500) {
        console.error(error);
      } else if (nodeEnv === 'development') {
        console.warn(`${error.status} ${c.req.method} ${c.req.path}`);
      }
      return errorResponse(error.status, error.code, error.message);
    }

    if (error instanceof HTTPException) {
      if (error.status >= 500) {
        console.error(error);
      } else if (nodeEnv === 'development') {
        console.warn(`${error.status} ${c.req.method} ${c.req.path}`);
      }
      const code = error.status === 403 ? 'csrf_failed' : 'http_error';
      return errorResponse(error.status, code, 'Request could not be completed.');
    }

    console.error(error);
    return errorResponse(500, 'internal_error', 'An internal error occurred.');
  };
}

export const notFound: NotFoundHandler<AppEnv> = () =>
  errorResponse(404, 'not_found', 'The requested resource was not found.');
