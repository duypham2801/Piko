import { DECISION_LIMITS } from '@piko/domain';
import type { DecisionData, DecisionDraftData, DecisionRecordData } from '@piko/domain';
import { and, asc, desc, eq, sql } from 'drizzle-orm';

import type { Database } from '../db/client.js';
import { decisions, type DecisionRow, users } from '../db/schema.js';
import { HttpError } from '../lib/errors.js';

function toRecord(row: DecisionRow): DecisionRecordData {
  const decision: DecisionData = {
    id: row.id,
    title: row.title,
    options: row.options,
  };
  if (row.category !== null) {
    decision.category = row.category;
  }

  return {
    decision,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listDecisions(db: Database, userId: string): Promise<DecisionRecordData[]> {
  const rows = await db
    .select()
    .from(decisions)
    .where(eq(decisions.userId, userId))
    .orderBy(desc(decisions.updatedAt), asc(decisions.id));
  return rows.map(toRecord);
}

export async function getDecision(
  db: Database,
  userId: string,
  id: string,
): Promise<DecisionRecordData | null> {
  const rows = await db
    .select()
    .from(decisions)
    .where(and(eq(decisions.id, id), eq(decisions.userId, userId)))
    .limit(1);
  const row = rows[0];
  return row ? toRecord(row) : null;
}

export async function createDecision(
  db: Database,
  userId: string,
  draft: DecisionDraftData,
  now: Date = new Date(),
): Promise<DecisionRecordData> {
  return db.transaction(async (tx) => {
    await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for('update');

    const countRows = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(decisions)
      .where(eq(decisions.userId, userId));
    const decisionCount = countRows[0]?.count ?? 0;
    if (decisionCount >= DECISION_LIMITS.maxDecisionsPerUser) {
      throw new HttpError(
        409,
        'decision_limit_reached',
        'You have reached the maximum number of decisions.',
      );
    }

    const inserted = await tx
      .insert(decisions)
      .values({
        userId,
        title: draft.title,
        category: draft.category ?? null,
        options: draft.options,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    const row = inserted[0];
    if (!row) {
      throw new Error('Failed to create decision');
    }
    return toRecord(row);
  });
}

export async function updateDecision(
  db: Database,
  userId: string,
  id: string,
  draft: DecisionDraftData,
  now: Date = new Date(),
): Promise<DecisionRecordData | null> {
  const updated = await db
    .update(decisions)
    .set({
      title: draft.title,
      category: draft.category ?? null,
      options: draft.options,
      updatedAt: now,
    })
    .where(and(eq(decisions.id, id), eq(decisions.userId, userId)))
    .returning();
  const row = updated[0];
  return row ? toRecord(row) : null;
}

export async function deleteDecision(db: Database, userId: string, id: string): Promise<boolean> {
  const deleted = await db
    .delete(decisions)
    .where(and(eq(decisions.id, id), eq(decisions.userId, userId)))
    .returning({ id: decisions.id });
  return deleted.length > 0;
}
