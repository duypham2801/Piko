import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';

import { DECISION_LIMITS } from '@piko/domain';

import { createGuestSession } from '../auth/session.service.js';
import { decisions, users } from '../db/schema.js';
import { HttpError } from '../lib/errors.js';
import {
  createDecision,
  deleteDecision,
  getDecision,
  listDecisions,
  updateDecision,
} from './decisions.service.js';
import { makeDraft, makeOption } from '../test/decisions.fixtures.js';
import { createTestDatabase } from '../test/pglite.js';

const firstNow = new Date('2026-01-01T00:00:00.000Z');

describe('decision service', () => {
  let testDatabase: Awaited<ReturnType<typeof createTestDatabase>>;

  beforeAll(async () => {
    testDatabase = await createTestDatabase();
  });

  afterAll(async () => {
    await testDatabase.close();
  });

  beforeEach(async () => {
    await testDatabase.db.delete(users);
  });

  it('creates, gets, and lists records with exact option JSON data', async () => {
    const session = await createGuestSession(testDatabase.db, firstNow);
    const draft = makeDraft({
      title: '  Dinner  ',
      options: [
        makeOption(0, { label: ' Phở ', emoji: '🍜', weight: 5, enabled: true }),
        makeOption(1, { label: 'Bánh mì', emoji: '🥖', weight: 2, enabled: true }),
      ],
    });

    const created = await createDecision(testDatabase.db, session.user.id, draft, firstNow);
    expect(created.decision.title).toBe('  Dinner  ');
    expect(created.decision).not.toHaveProperty('category');
    expect(created.decision.options).toEqual([
      { ...makeOption(0), label: ' Phở ', emoji: '🍜', weight: 5, enabled: true },
      { ...makeOption(1), label: 'Bánh mì', emoji: '🥖', weight: 2, enabled: true },
    ]);
    expect(created.createdAt).toBe(firstNow.toISOString());
    expect(created.updatedAt).toBe(firstNow.toISOString());
    expect(await getDecision(testDatabase.db, session.user.id, created.decision.id)).toEqual(
      created,
    );
    expect(await listDecisions(testDatabase.db, session.user.id)).toEqual([created]);
  });

  it('keeps users separate and orders by updated time descending', async () => {
    const firstUser = await createGuestSession(testDatabase.db, firstNow);
    const secondUser = await createGuestSession(testDatabase.db, firstNow);
    const older = await createDecision(
      testDatabase.db,
      firstUser.user.id,
      makeDraft({ title: 'Older' }),
      firstNow,
    );
    const newer = await createDecision(
      testDatabase.db,
      firstUser.user.id,
      makeDraft({ title: 'Newer', options: [makeOption(0), makeOption(2)] }),
      new Date('2026-01-02T00:00:00.000Z'),
    );
    const other = await createDecision(
      testDatabase.db,
      secondUser.user.id,
      makeDraft({ title: 'Other', options: [makeOption(1), makeOption(2)] }),
      firstNow,
    );

    expect(await listDecisions(testDatabase.db, firstUser.user.id)).toEqual([newer, older]);
    expect(await listDecisions(testDatabase.db, secondUser.user.id)).toEqual([other]);
  });

  it('does not expose records owned by another user', async () => {
    const owner = await createGuestSession(testDatabase.db, firstNow);
    const otherUser = await createGuestSession(testDatabase.db, firstNow);
    const created = await createDecision(testDatabase.db, owner.user.id, makeDraft(), firstNow);

    expect(await getDecision(testDatabase.db, otherUser.user.id, created.decision.id)).toBeNull();
    expect(
      await updateDecision(
        testDatabase.db,
        otherUser.user.id,
        created.decision.id,
        makeDraft({ title: 'Changed' }),
        new Date('2026-01-02T00:00:00.000Z'),
      ),
    ).toBeNull();
    expect(await deleteDecision(testDatabase.db, otherUser.user.id, created.decision.id)).toBe(
      false,
    );
    expect(await getDecision(testDatabase.db, owner.user.id, created.decision.id)).toEqual(created);
  });

  it('updates content without changing id or creation time', async () => {
    const session = await createGuestSession(testDatabase.db, firstNow);
    const created = await createDecision(
      testDatabase.db,
      session.user.id,
      makeDraft({ category: 'food' }),
      firstNow,
    );
    const updatedAt = new Date('2026-01-03T00:00:00.000Z');
    const updated = await updateDecision(
      testDatabase.db,
      session.user.id,
      created.decision.id,
      makeDraft({ title: 'Lunch', options: [makeOption(1), makeOption(2)] }),
      updatedAt,
    );

    expect(updated).not.toBeNull();
    if (updated) {
      expect(updated.decision.id).toBe(created.decision.id);
      expect(updated.createdAt).toBe(created.createdAt);
      expect(updated.updatedAt).toBe(updatedAt.toISOString());
      expect(updated.decision).not.toHaveProperty('category');
      expect(updated.decision.title).toBe('Lunch');
    }
  });

  it('deletes records and cascades when their user is deleted', async () => {
    const session = await createGuestSession(testDatabase.db, firstNow);
    const created = await createDecision(testDatabase.db, session.user.id, makeDraft(), firstNow);

    expect(await deleteDecision(testDatabase.db, session.user.id, created.decision.id)).toBe(true);
    expect(await deleteDecision(testDatabase.db, session.user.id, created.decision.id)).toBe(false);
    expect(await getDecision(testDatabase.db, session.user.id, created.decision.id)).toBeNull();

    const cascadeUser = await createGuestSession(testDatabase.db, firstNow);
    const cascadeDecision = await createDecision(
      testDatabase.db,
      cascadeUser.user.id,
      makeDraft(),
      firstNow,
    );
    await testDatabase.db.delete(users).where(eq(users.id, cascadeUser.user.id));
    expect(
      await testDatabase.db
        .select({ id: decisions.id })
        .from(decisions)
        .where(eq(decisions.id, cascadeDecision.decision.id)),
    ).toEqual([]);
  });

  it('rejects the 101st decision for a user', async () => {
    const session = await createGuestSession(testDatabase.db, firstNow);
    await testDatabase.db.insert(decisions).values(
      Array.from({ length: DECISION_LIMITS.maxDecisionsPerUser }, (_, index) => ({
        userId: session.user.id,
        title: `Decision ${index + 1}`,
        category: null,
        options: [makeOption(0), makeOption(1)],
        createdAt: firstNow,
        updatedAt: firstNow,
      })),
    );

    await expect(
      createDecision(testDatabase.db, session.user.id, makeDraft(), firstNow),
    ).rejects.toMatchObject<Partial<HttpError>>({
      status: 409,
      code: 'decision_limit_reached',
      message: 'You have reached the maximum number of decisions.',
    });

    const otherUser = await createGuestSession(testDatabase.db, firstNow);
    await expect(
      createDecision(testDatabase.db, otherUser.user.id, makeDraft(), firstNow),
    ).resolves.toBeDefined();
  });
});
