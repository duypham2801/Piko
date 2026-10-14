import { and, eq, inArray, isNotNull, lte, notExists } from 'drizzle-orm';

import type { Database } from '../db/client.js';
import { decisions, decisionSessions, sessions, sharedCases, users } from '../db/schema.js';

export const GUEST_ABANDON_AFTER_MS = 30 * 24 * 60 * 60 * 1000;
export const PRUNE_INTERVAL_MS = 6 * 60 * 60 * 1000;

export interface PruneResult {
  sessions: number;
  guests: number;
  shares: number;
}

export async function pruneExpiredData(db: Database, now = new Date()): Promise<PruneResult> {
  return db.transaction(async (tx) => {
    let sessionCount = 0;
    let guestCount = 0;
    let shareCount = 0;

    const expiredSessions = await tx
      .delete(sessions)
      .where(lte(sessions.expiresAt, now))
      .returning({ id: sessions.id });
    sessionCount += expiredSessions.length;

    const unreachableGuests = await tx
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.kind, 'guest'),
          notExists(
            tx.select({ id: sessions.id }).from(sessions).where(eq(sessions.userId, users.id)),
          ),
        ),
      );
    const unreachableGuestIds = unreachableGuests.map(({ id }) => id);

    if (unreachableGuestIds.length > 0) {
      const cascadingSessions = await tx
        .select({ id: sessions.id })
        .from(sessions)
        .where(inArray(sessions.userId, unreachableGuestIds));
      const cascadingShares = await tx
        .select({ id: sharedCases.id })
        .from(sharedCases)
        .where(inArray(sharedCases.userId, unreachableGuestIds));
      sessionCount += cascadingSessions.length;
      shareCount += cascadingShares.length;

      const deletedGuests = await tx
        .delete(users)
        .where(inArray(users.id, unreachableGuestIds))
        .returning({ id: users.id });
      guestCount += deletedGuests.length;
    }

    const abandonedBefore = new Date(now.getTime() - GUEST_ABANDON_AFTER_MS);
    const abandonedGuests = await tx
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.kind, 'guest'),
          lte(users.lastSeenAt, abandonedBefore),
          notExists(
            tx.select({ id: decisions.id }).from(decisions).where(eq(decisions.userId, users.id)),
          ),
          notExists(
            tx
              .select({ id: decisionSessions.id })
              .from(decisionSessions)
              .where(eq(decisionSessions.userId, users.id)),
          ),
          notExists(
            tx
              .select({ id: sharedCases.id })
              .from(sharedCases)
              .where(eq(sharedCases.userId, users.id)),
          ),
        ),
      );
    const abandonedGuestIds = abandonedGuests.map(({ id }) => id);

    if (abandonedGuestIds.length > 0) {
      const cascadingSessions = await tx
        .select({ id: sessions.id })
        .from(sessions)
        .where(inArray(sessions.userId, abandonedGuestIds));
      sessionCount += cascadingSessions.length;

      const deletedGuests = await tx
        .delete(users)
        .where(inArray(users.id, abandonedGuestIds))
        .returning({ id: users.id });
      guestCount += deletedGuests.length;
    }

    const expiredShares = await tx
      .delete(sharedCases)
      .where(and(isNotNull(sharedCases.expiresAt), lte(sharedCases.expiresAt, now)))
      .returning({ id: sharedCases.id });
    shareCount += expiredShares.length;

    return { sessions: sessionCount, guests: guestCount, shares: shareCount };
  });
}
