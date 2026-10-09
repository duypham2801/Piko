import {
  DECISION_LIMITS,
  matchesSelection,
  type HistoryEntryCreateData,
  type HistoryEntryData,
  type HistorySourceData,
} from '@piko/domain';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';

import type { Database } from '../db/client.js';
import { decisions, decisionSessions, type DecisionSessionRow, users } from '../db/schema.js';
import { HttpError } from '../lib/errors.js';

function toHistoryEntry(row: DecisionSessionRow): HistoryEntryData {
  let source: HistorySourceData;
  if (row.source === 'decision') {
    source = { kind: 'decision', decisionId: row.decisionId };
  } else if (row.source === 'preset') {
    if (row.presetSlug === null) {
      throw new Error('History preset source is missing its slug.');
    }
    source = { kind: 'preset', slug: row.presetSlug };
  } else {
    source = { kind: 'draft' };
  }

  const winner = row.options.find((option) => option.id === row.result.winnerId);
  if (!winner) {
    throw new Error('History result winner is missing from its options.');
  }

  return {
    id: row.id,
    source,
    title: row.title,
    winner,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listHistory(
  db: Database,
  userId: string,
  limit: number,
): Promise<HistoryEntryData[]> {
  const rows = await db
    .select()
    .from(decisionSessions)
    .where(eq(decisionSessions.userId, userId))
    .orderBy(desc(decisionSessions.createdAt), asc(decisionSessions.id))
    .limit(limit);

  return rows.map(toHistoryEntry);
}

export async function createHistoryEntry(
  db: Database,
  userId: string,
  input: HistoryEntryCreateData,
  now: Date = new Date(),
): Promise<HistoryEntryData> {
  if (!matchesSelection(input.decision.options, input.result)) {
    throw new HttpError(400, 'invalid_result', 'The result does not match the options.');
  }

  return db.transaction(async (tx) => {
    await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for('update');

    let decisionId: string | null = null;
    if (input.source.kind === 'decision') {
      const linkedDecision = await tx
        .select({ id: decisions.id })
        .from(decisions)
        .where(and(eq(decisions.id, input.source.decisionId), eq(decisions.userId, userId)))
        .limit(1);
      decisionId = linkedDecision[0]?.id ?? null;
    }

    const inserted = await tx
      .insert(decisionSessions)
      .values({
        userId,
        source: input.source.kind,
        decisionId,
        presetSlug: input.source.kind === 'preset' ? input.source.slug : null,
        title: input.decision.title,
        options: input.decision.options,
        result: input.result,
        createdAt: now,
      })
      .returning();
    const row = inserted[0];
    if (!row) {
      throw new Error('Failed to create history entry.');
    }

    const userRows = await tx
      .select({ id: decisionSessions.id })
      .from(decisionSessions)
      .where(eq(decisionSessions.userId, userId))
      .orderBy(desc(decisionSessions.createdAt), asc(decisionSessions.id));
    const idsToDelete = userRows
      .slice(DECISION_LIMITS.maxHistoryEntriesPerUser)
      .map((historyRow) => historyRow.id);
    if (idsToDelete.length > 0) {
      await tx
        .delete(decisionSessions)
        .where(and(eq(decisionSessions.userId, userId), inArray(decisionSessions.id, idsToDelete)));
    }

    return toHistoryEntry(row);
  });
}
