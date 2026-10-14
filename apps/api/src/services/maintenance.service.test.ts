import { and, eq, gt } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createGuestSession } from '../auth/session.service.js';
import { decisions, sessions, sharedCases, users } from '../db/schema.js';
import { makeDraft, makeOption } from '../test/decisions.fixtures.js';
import { createTestDatabase } from '../test/pglite.js';
import { createShare } from './shares.service.js';
import { GUEST_ABANDON_AFTER_MS, pruneExpiredData } from './maintenance.service.js';

const now = new Date('2026-01-15T12:00:00.000Z');

function makeDecision(userId: string, createdAt = now) {
  return {
    userId,
    title: 'Decision',
    category: null,
    options: [makeOption(0), makeOption(1)],
    createdAt,
    updatedAt: createdAt,
  };
}

describe('pruneExpiredData', () => {
  let testDatabase: Awaited<ReturnType<typeof createTestDatabase>>;

  beforeAll(async () => {
    testDatabase = await createTestDatabase();
  });

  beforeEach(async () => {
    await testDatabase.db.delete(users);
  });

  afterAll(async () => {
    await testDatabase.close();
  });

  it('deletes expired sessions but keeps valid sessions', async () => {
    const expired = await createGuestSession(testDatabase.db, new Date(now.getTime() - 2_000));
    const valid = await createGuestSession(testDatabase.db, now);

    await testDatabase.db
      .update(sessions)
      .set({ expiresAt: new Date(now.getTime() - 1_000) })
      .where(eq(sessions.id, expired.session.id));
    await testDatabase.db
      .update(sessions)
      .set({ expiresAt: new Date(now.getTime() + 1_000) })
      .where(eq(sessions.id, valid.session.id));

    const result = await pruneExpiredData(testDatabase.db, now);
    expect(result.sessions).toBe(1);

    const remaining = await testDatabase.db.select({ id: sessions.id }).from(sessions);
    expect(remaining).toEqual([{ id: valid.session.id }]);
  });

  it('deletes guests with no remaining session and cascades their data', async () => {
    const guest = await createGuestSession(testDatabase.db, now);
    await testDatabase.db.insert(decisions).values(makeDecision(guest.user.id));

    await testDatabase.db.delete(sessions).where(eq(sessions.id, guest.session.id));
    const result = await pruneExpiredData(testDatabase.db, now);

    expect(result.guests).toBe(1);
    expect(await testDatabase.db.select().from(users)).toHaveLength(0);
    expect(await testDatabase.db.select().from(decisions)).toHaveLength(0);
  });

  it('keeps an old guest with a valid session when it still has data', async () => {
    const guest = await createGuestSession(testDatabase.db, now);
    const old = new Date(now.getTime() - GUEST_ABANDON_AFTER_MS - 1_000);
    await testDatabase.db.update(users).set({ lastSeenAt: old }).where(eq(users.id, guest.user.id));
    await testDatabase.db.insert(decisions).values(makeDecision(guest.user.id, old));

    const result = await pruneExpiredData(testDatabase.db, now);

    expect(result.guests).toBe(0);
    expect(await testDatabase.db.select({ id: users.id }).from(users)).toEqual([
      { id: guest.user.id },
    ]);
    expect(await testDatabase.db.select({ id: decisions.id }).from(decisions)).toHaveLength(1);
  });

  it('deletes empty guests older than 30 days and keeps guests at 29 days', async () => {
    const oldGuest = await createGuestSession(testDatabase.db, now);
    const recentGuest = await createGuestSession(testDatabase.db, now);
    await testDatabase.db
      .update(users)
      .set({ lastSeenAt: new Date(now.getTime() - GUEST_ABANDON_AFTER_MS - 1_000) })
      .where(eq(users.id, oldGuest.user.id));
    await testDatabase.db
      .update(users)
      .set({ lastSeenAt: new Date(now.getTime() - 29 * 24 * 60 * 60 * 1_000) })
      .where(eq(users.id, recentGuest.user.id));

    const result = await pruneExpiredData(testDatabase.db, now);

    expect(result).toEqual({ sessions: 1, guests: 1, shares: 0 });
    expect(await testDatabase.db.select({ id: users.id }).from(users)).toEqual([
      { id: recentGuest.user.id },
    ]);
    expect(await testDatabase.db.select({ id: sessions.id }).from(sessions)).toEqual([
      { id: recentGuest.session.id },
    ]);
  });

  it('deletes only expired shares and keeps future and non-expiring shares', async () => {
    const guest = await createGuestSession(testDatabase.db, now);
    const decision = makeDraft({ title: 'Decision', options: [makeOption(0), makeOption(1)] });

    const expired = await createShare(
      testDatabase.db,
      guest.user.id,
      { decision, result: null, lifetime: '7d' },
      now,
    );
    const future = await createShare(
      testDatabase.db,
      guest.user.id,
      { decision, result: null, lifetime: '7d' },
      now,
    );
    const forever = await createShare(
      testDatabase.db,
      guest.user.id,
      { decision, result: null, lifetime: 'never' },
      now,
    );
    await testDatabase.db
      .update(sharedCases)
      .set({ expiresAt: new Date(now.getTime() - 1_000) })
      .where(eq(sharedCases.id, expired.id));

    const result = await pruneExpiredData(testDatabase.db, now);

    expect(result.shares).toBe(1);
    const remaining = await testDatabase.db
      .select({ id: sharedCases.id })
      .from(sharedCases)
      .where(and(gt(sharedCases.expiresAt, now), eq(sharedCases.userId, guest.user.id)));
    expect(remaining.map(({ id }) => id)).toEqual([future.id]);
    expect(
      await testDatabase.db
        .select({ id: sharedCases.id })
        .from(sharedCases)
        .where(eq(sharedCases.id, forever.id)),
    ).toEqual([{ id: forever.id }]);
  });

  it('keeps registered users even when they have no session', async () => {
    const [registered] = await testDatabase.db
      .insert(users)
      .values({ kind: 'registered' })
      .returning();
    if (!registered) throw new Error('Expected a registered user.');

    const result = await pruneExpiredData(testDatabase.db, now);

    expect(result.guests).toBe(0);
    expect(await testDatabase.db.select({ id: users.id }).from(users)).toEqual([
      { id: registered.id },
    ]);
  });

  it('keeps the count result aligned with all deleted row types', async () => {
    const guest = await createGuestSession(testDatabase.db, now);
    await testDatabase.db
      .update(sessions)
      .set({ expiresAt: new Date(now.getTime() - 1_000) })
      .where(eq(sessions.id, guest.session.id));
    const result = await pruneExpiredData(testDatabase.db, now);

    expect(result).toEqual({ sessions: 1, guests: 1, shares: 0 });
  });
});
