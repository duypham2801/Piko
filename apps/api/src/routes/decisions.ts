import {
  DecisionDraft,
  type DecisionListResponseData,
  type DecisionRecordData,
} from '@piko/domain';
import { Hono } from 'hono';

import type { AppEnv } from '../auth/session.middleware.js';
import type { Database } from '../db/client.js';
import { notFoundError, parseUuidParam, readJsonBody } from '../lib/http.js';
import {
  createDecision,
  deleteDecision,
  getDecision,
  listDecisions,
  updateDecision,
} from '../services/decisions.service.js';

export interface DecisionsRouteDependencies {
  db: Database;
}

export function createDecisionRoutes(dependencies: DecisionsRouteDependencies): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  routes.get('/', async (c) => {
    const decisions = await listDecisions(dependencies.db, c.var.user.id);
    const response: DecisionListResponseData = { decisions };
    return c.json(response, 200);
  });

  routes.post('/', async (c) => {
    const draft = await readJsonBody(c, DecisionDraft, 'The decision is invalid.');
    const record: DecisionRecordData = await createDecision(dependencies.db, c.var.user.id, draft);
    return c.json(record, 201);
  });

  routes.get('/:id', async (c) => {
    const id = parseUuidParam(c.req.param('id'));
    const record = await getDecision(dependencies.db, c.var.user.id, id);
    if (!record) {
      throw notFoundError();
    }
    return c.json(record, 200);
  });

  routes.put('/:id', async (c) => {
    const id = parseUuidParam(c.req.param('id'));
    const draft = await readJsonBody(c, DecisionDraft, 'The decision is invalid.');
    const record = await updateDecision(dependencies.db, c.var.user.id, id, draft);
    if (!record) {
      throw notFoundError();
    }
    return c.json(record, 200);
  });

  routes.delete('/:id', async (c) => {
    const id = parseUuidParam(c.req.param('id'));
    const deleted = await deleteDecision(dependencies.db, c.var.user.id, id);
    if (!deleted) {
      throw notFoundError();
    }
    return c.body(null, 204);
  });

  return routes;
}
