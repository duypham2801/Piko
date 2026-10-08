import { and, eq, gt } from 'drizzle-orm';

import type { Database } from '../db/client.js';
import { sessions, type SessionRow, users, type UserRow } from '../db/schema.js';
import { generateSessionToken, hashSessionToken } from './token.js';

export const SESSION_COOKIE_NAME = 'piko_sid';
export const SESSION_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;
export const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_SECONDS * 1000;
export const SESSION_TOUCH_INTERVAL_MS = 24 * 60 * 60 * 1000;

export type SessionUser = Pick<UserRow, 'id' | 'kind' | 'createdAt' | 'lastSeenAt'>;
export type SessionRecord = SessionRow;

export interface ResolvedSession {
  session: SessionRecord;
  user: SessionUser;
}

export interface CreatedGuestSession extends ResolvedSession {
  token: string;
}

export async function resolveSession(
  db: Database,
  token: string,
  now: Date = new Date(),
): Promise<ResolvedSession | null> {
  const tokenHash = hashSessionToken(token);
  const rows = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now)))
    .limit(1);

  const row = rows[0];
  return row ?? null;
}

export async function createGuestSession(
  db: Database,
  now: Date = new Date(),
): Promise<CreatedGuestSession> {
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(now.getTime() + SESSION_MAX_AGE_MS);

  return db.transaction(async (tx) => {
    const insertedUsers = await tx
      .insert(users)
      .values({ kind: 'guest', createdAt: now, lastSeenAt: now })
      .returning();
    const user = insertedUsers[0];
    if (!user) {
      throw new Error('Failed to create guest user');
    }

    const insertedSessions = await tx
      .insert(sessions)
      .values({
        userId: user.id,
        tokenHash,
        createdAt: now,
        lastUsedAt: now,
        expiresAt,
      })
      .returning();
    const session = insertedSessions[0];
    if (!session) {
      throw new Error('Failed to create guest session');
    }

    return { token, user, session };
  });
}

export async function touchSession(
  db: Database,
  session: SessionRecord,
  now: Date,
): Promise<boolean> {
  if (now.getTime() - session.lastUsedAt.getTime() < SESSION_TOUCH_INTERVAL_MS) {
    return false;
  }

  const expiresAt = new Date(now.getTime() + SESSION_MAX_AGE_MS);
  await db.transaction(async (tx) => {
    await tx
      .update(sessions)
      .set({ lastUsedAt: now, expiresAt })
      .where(eq(sessions.id, session.id));
    await tx.update(users).set({ lastSeenAt: now }).where(eq(users.id, session.userId));
  });
  return true;
}
