import {
  DecisionDraft,
  type DecisionDraftData,
  type DecisionListResponseData,
  type DecisionRecordData,
} from '@piko/domain';
import { Hono } from 'hono';
import type { Context } from 'hono';
import { z } from 'zod';

import type { AppEnv } from '../auth/session.middleware.js';
import type { Database } from '../db/client.js';
import { HttpError } from '../lib/errors.js';
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

function notFoundError(): HttpError {
  return new HttpError(404, 'not_found', 'The requested resource was not found.');
}

function parseDecisionId(id: string): string {
  const result = z.uuid().safeParse(id);
  if (!result.success) {
    throw notFoundError();
  }
  return result.data;
}

async function parseDraft(c: Context<AppEnv>): Promise<DecisionDraftData> {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new HttpError(400, 'invalid_json', 'The request body is not valid JSON.');
  }

  const result = DecisionDraft.safeParse(body);
  if (!result.success) {
    throw new HttpError(400, 'invalid_body', 'The decision is invalid.');
  }
  return result.data;
}

export function createDecisionRoutes(dependencies: DecisionsRouteDependencies): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  routes.get('/', async (c) => {
    const decisions = await listDecisions(dependencies.db, c.var.user.id);
    const response: DecisionListResponseData = { decisions };
    return c.json(response, 200);
  });

  routes.post('/', async (c) => {
    const draft = await parseDraft(c);
    const record: DecisionRecordData = await createDecision(dependencies.db, c.var.user.id, draft);
    return c.json(record, 201);
  });

  routes.get('/:id', async (c) => {
    const id = parseDecisionId(c.req.param('id'));
    const record = await getDecision(dependencies.db, c.var.user.id, id);
    if (!record) {
      throw notFoundError();
    }
    return c.json(record, 200);
  });

  routes.put('/:id', async (c) => {
    const id = parseDecisionId(c.req.param('id'));
    const draft = await parseDraft(c);
    const record = await updateDecision(dependencies.db, c.var.user.id, id, draft);
    if (!record) {
      throw notFoundError();
    }
    return c.json(record, 200);
  });

  routes.delete('/:id', async (c) => {
    const id = parseDecisionId(c.req.param('id'));
    const deleted = await deleteDecision(dependencies.db, c.var.user.id, id);
    if (!deleted) {
      throw notFoundError();
    }
    return c.body(null, 204);
  });

  return routes;
}
