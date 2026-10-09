import {
  SharedCaseCreate,
  SharedCaseSpin,
  type ApiErrorData,
  type SharedCaseData,
  type SharedCaseListResponseData,
} from '@piko/domain';
import { Hono } from 'hono';
import { z } from 'zod';

import type { AppEnv } from '../auth/session.middleware.js';
import type { Database } from '../db/client.js';
import { parseUuidParam, readJsonBody } from '../lib/http.js';
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

export function createShareRoutes(dependencies: SharesRouteDependencies): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  routes.get('/', async (c) => {
    const shares = await listShares(dependencies.db, c.var.user.id);
    const response: SharedCaseListResponseData = { shares };
    return c.json(response, 200);
  });

  routes.post('/', async (c) => {
    const input = await readJsonBody(c, SharedCaseCreate, 'The shared case is invalid.');
    const share: SharedCaseData = await createShare(dependencies.db, c.var.user.id, input);
    return c.json(share, 201);
  });

  routes.delete('/:id', async (c) => {
    const id = parseUuidParam(c.req.param('id'));
    await revokeShare(dependencies.db, c.var.user.id, id);
    return c.body(null, 204);
  });

  routes.post('/:id/spins', async (c) => {
    const id = parseUuidParam(c.req.param('id'));
    const input = await readJsonBody(c, SharedCaseSpin, 'The spin is invalid.');
    const share: SharedCaseData = await recordShareSpin(dependencies.db, c.var.user.id, id, input);
    return c.json(share, 200);
  });

  return routes;
}

export function createPublicShareRoutes(dependencies: SharesRouteDependencies): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  routes.get('/:id', async (c) => {
    c.header('Cache-Control', 'no-store');
    const notFound: ApiErrorData = {
      error: { code: 'not_found', message: 'The requested resource was not found.' },
    };
    const idResult = z.uuid().safeParse(c.req.param('id'));
    if (!idResult.success) {
      return c.json(notFound, 404);
    }

    const share = await getPublicShare(dependencies.db, idResult.data);
    if (share === null) {
      return c.json(notFound, 404);
    }
    return c.json(share, 200);
  });

  return routes;
}
