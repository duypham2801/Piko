import {
  DECISION_LIMITS,
  HistoryEntryCreate,
  type HistoryEntryData,
  type HistoryListResponseData,
} from '@piko/domain';
import { Hono } from 'hono';
import type { Context } from 'hono';

import type { AppEnv } from '../auth/session.middleware.js';
import type { Database } from '../db/client.js';
import { HttpError } from '../lib/errors.js';
import { readJsonBody } from '../lib/http.js';
import { createHistoryEntry, listHistory } from '../services/history.service.js';

export interface HistoryRouteDependencies {
  db: Database;
}

function parseLimit(c: Context<AppEnv>): number {
  const rawLimit = new URL(c.req.url).searchParams.get('limit');
  if (rawLimit === null) {
    return DECISION_LIMITS.maxHistoryEntriesPerUser;
  }

  const limit = Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > DECISION_LIMITS.maxHistoryEntriesPerUser) {
    throw new HttpError(400, 'invalid_query', 'The query is invalid.');
  }
  return limit;
}

export function createHistoryRoutes(dependencies: HistoryRouteDependencies): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  routes.get('/', async (c) => {
    const entries = await listHistory(dependencies.db, c.var.user.id, parseLimit(c));
    const response: HistoryListResponseData = { entries };
    return c.json(response, 200);
  });

  routes.post('/', async (c) => {
    const input = await readJsonBody(c, HistoryEntryCreate, 'The history entry is invalid.');
    const entry: HistoryEntryData = await createHistoryEntry(dependencies.db, c.var.user.id, input);
    return c.json(entry, 201);
  });

  return routes;
}
