import {
  DECISION_LIMITS,
  matchesSelection,
  SHARE_LIFETIME_DAYS,
  type SharedCaseCreateData,
  type SharedCaseData,
  type SharedCaseSpinData,
} from '@piko/domain';
import { and, asc, desc, eq, gt, isNotNull, isNull, lte, or, sql } from 'drizzle-orm';

import type { Database } from '../db/client.js';
import { sharedCases, type SharedCaseRow, users } from '../db/schema.js';
import { HttpError } from '../lib/errors.js';

function notFoundError(): HttpError {
  return new HttpError(404, 'not_found', 'The requested resource was not found.');
}

function toSharedCase(row: SharedCaseRow): SharedCaseData {
  const sharedCase: SharedCaseData = {
    id: row.id,
    title: row.title,
    options: row.options,
    result: row.result,
    spunAt: row.spunAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt?.toISOString() ?? null,
  };
  if (row.category !== null) {
    sharedCase.category = row.category;
  }
  return sharedCase;
}

function activeAt(now: Date) {
  return or(isNull(sharedCases.expiresAt), gt(sharedCases.expiresAt, now));
}

function sameOptionSet(
  storedOptions: SharedCaseRow['options'],
  inputOptions: SharedCaseSpinData['options'],
): boolean {
  return (
    storedOptions.length === inputOptions.length &&
    storedOptions.every((stored, index) => {
      const input = inputOptions[index];
      return (
        input !== undefined &&
        stored.id === input.id &&
        stored.label === input.label &&
        stored.emoji === input.emoji &&
        stored.weight === input.weight
      );
    })
  );
}

export async function createShare(
  db: Database,
  userId: string,
  input: SharedCaseCreateData,
  now: Date = new Date(),
): Promise<SharedCaseData> {
  if (input.result !== null && !matchesSelection(input.decision.options, input.result)) {
    throw new HttpError(400, 'invalid_result', 'The result does not match the options.');
  }

  return db.transaction(async (tx) => {
    await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for('update');

    await tx
      .delete(sharedCases)
      .where(
        and(
          eq(sharedCases.userId, userId),
          isNotNull(sharedCases.expiresAt),
          lte(sharedCases.expiresAt, now),
        ),
      );

    const countRows = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(sharedCases)
      .where(eq(sharedCases.userId, userId));
    const shareCount = countRows[0]?.count ?? 0;
    if (shareCount >= DECISION_LIMITS.maxActiveSharesPerUser) {
      throw new HttpError(409, 'share_limit_reached', 'The share limit has been reached.');
    }

    const lifetimeDays = SHARE_LIFETIME_DAYS[input.lifetime];
    const expiresAt =
      lifetimeDays === null ? null : new Date(now.getTime() + lifetimeDays * 24 * 60 * 60 * 1000);
    const inserted = await tx
      .insert(sharedCases)
      .values({
        userId,
        title: input.decision.title,
        category: input.decision.category ?? null,
        options: input.decision.options,
        result: input.result,
        spunAt: input.result === null ? null : now,
        createdAt: now,
        expiresAt,
      })
      .returning();
    const row = inserted[0];
    if (!row) {
      throw new Error('Failed to create shared case.');
    }
    return toSharedCase(row);
  });
}

export async function listShares(
  db: Database,
  userId: string,
  now: Date = new Date(),
): Promise<SharedCaseData[]> {
  const rows = await db
    .select()
    .from(sharedCases)
    .where(and(eq(sharedCases.userId, userId), activeAt(now)))
    .orderBy(desc(sharedCases.createdAt), asc(sharedCases.id));
  return rows.map(toSharedCase);
}

export async function revokeShare(db: Database, userId: string, shareId: string): Promise<void> {
  const deleted = await db
    .delete(sharedCases)
    .where(and(eq(sharedCases.id, shareId), eq(sharedCases.userId, userId)))
    .returning({ id: sharedCases.id });
  if (deleted.length === 0) {
    throw notFoundError();
  }
}

export async function recordShareSpin(
  db: Database,
  userId: string,
  shareId: string,
  input: SharedCaseSpinData,
  now: Date = new Date(),
): Promise<SharedCaseData> {
  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(sharedCases)
      .where(and(eq(sharedCases.id, shareId), eq(sharedCases.userId, userId), activeAt(now)))
      .limit(1)
      .for('update');
    const row = rows[0];
    if (!row) {
      throw notFoundError();
    }

    if (!sameOptionSet(row.options, input.options)) {
      throw new HttpError(400, 'invalid_options', 'The options do not match the shared case.');
    }
    if (!matchesSelection(input.options, input.result)) {
      throw new HttpError(400, 'invalid_result', 'The result does not match the options.');
    }

    const updated = await tx
      .update(sharedCases)
      .set({ options: input.options, result: input.result, spunAt: now })
      .where(and(eq(sharedCases.id, shareId), eq(sharedCases.userId, userId)))
      .returning();
    const updatedRow = updated[0];
    if (!updatedRow) {
      throw new Error('Failed to record shared case spin.');
    }
    return toSharedCase(updatedRow);
  });
}

export async function getPublicShare(
  db: Database,
  shareId: string,
  now: Date = new Date(),
): Promise<SharedCaseData> {
  const rows = await db
    .select()
    .from(sharedCases)
    .where(and(eq(sharedCases.id, shareId), activeAt(now)))
    .limit(1);
  const row = rows[0];
  if (!row) {
    throw notFoundError();
  }
  return toSharedCase(row);
}
