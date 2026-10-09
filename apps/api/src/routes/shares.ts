import {
  SharedCaseCreate,
  SharedCaseSpin,
  type SharedCaseCreateData,
  type SharedCaseData,
  type SharedCaseListResponseData,
  type SharedCaseSpinData,
} from '@piko/domain';
import { Hono } from 'hono';
import type { Context } from 'hono';
import { z } from 'zod';

import type { AppEnv } from '../auth/session.middleware.js';
import type { Database } from '../db/client.js';
import { HttpError } from '../lib/errors.js';
import {
  createShare,
  getPublicShare,
  listShares,
  recordShareSpin,
  revokeShare,
} from '../services/shares.service.js';

export interface SharesRouteDependencies {
  db: Database;
}

function notFoundError(): HttpError {
  return new HttpError(404, 'not_found', 'The requested resource was not found.');
}

function parseShareId(id: string): string {
  const result = z.uuid().safeParse(id);
  if (!result.success) {
    throw notFoundError();
  }
  return result.data;
}

async function parseSharedCaseCreate(c: Context<AppEnv>): Promise<SharedCaseCreateData> {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new HttpError(400, 'invalid_json', 'The request body is not valid JSON.');
  }

  const result = SharedCaseCreate.safeParse(body);
  if (!result.success) {
    throw new HttpError(400, 'invalid_body', 'The shared case is invalid.');
  }
  return result.data;
}

async function parseSharedCaseSpin(c: Context<AppEnv>): Promise<SharedCaseSpinData> {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new HttpError(400, 'invalid_json', 'The request body is not valid JSON.');
  }

  const result = SharedCaseSpin.safeParse(body);
  if (!result.success) {
    throw new HttpError(400, 'invalid_body', 'The spin is invalid.');
  }
  return result.data;
}

function noStore(response: Response): Response {
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

function publicNotFound(c: Context<AppEnv>): Response {
  return noStore(
    c.json({ error: { code: 'not_found', message: 'The requested resource was not found.' } }, 404),
  );
}

export function createShareRoutes(dependencies: SharesRouteDependencies): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  routes.get('/', async (c) => {
    const shares = await listShares(dependencies.db, c.var.user.id);
    const response: SharedCaseListResponseData = { shares };
    return c.json(response, 200);
  });

  routes.post('/', async (c) => {
    const input = await parseSharedCaseCreate(c);
    const share: SharedCaseData = await createShare(dependencies.db, c.var.user.id, input);
    return c.json(share, 201);
  });

  routes.delete('/:id', async (c) => {
    const id = parseShareId(c.req.param('id'));
    await revokeShare(dependencies.db, c.var.user.id, id);
    return c.body(null, 204);
  });

  routes.post('/:id/spins', async (c) => {
    const id = parseShareId(c.req.param('id'));
    const input = await parseSharedCaseSpin(c);
    const share: SharedCaseData = await recordShareSpin(dependencies.db, c.var.user.id, id, input);
    return c.json(share, 200);
  });

  return routes;
}

export function createPublicShareRoutes(dependencies: SharesRouteDependencies): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  routes.get('/:id', async (c) => {
    const idResult = z.uuid().safeParse(c.req.param('id'));
    if (!idResult.success) {
      return publicNotFound(c);
    }

    try {
      const share = await getPublicShare(dependencies.db, idResult.data);
      return noStore(c.json(share, 200));
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) {
        return publicNotFound(c);
      }
      throw error;
    }
  });

  return routes;
}
