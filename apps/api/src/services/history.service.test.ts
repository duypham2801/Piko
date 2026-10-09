import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';

import { DECISION_LIMITS, select, type DecisionDraftData } from '@piko/domain';

import { createGuestSession } from '../auth/session.service.js';
import { decisionSessions, decisions, users } from '../db/schema.js';
import { HttpError } from '../lib/errors.js';
import { createDecision, deleteDecision } from './decisions.service.js';
import { createHistoryEntry, listHistory } from './history.service.js';
import { makeDraft, makeOption } from '../test/decisions.fixtures.js';
import { createTestDatabase } from '../test/pglite.js';

const firstNow = new Date('2026-01-01T00:00:00.000Z');

function makeHistoryInput(
  overrides: Partial<DecisionDraftData> = {},
  source:
    | { kind: 'decision'; decisionId: string }
    | { kind: 'draft' }
    | { kind: 'preset'; slug: string } = { kind: 'draft' },
  seed = 42,
) {
  const decision = makeDraft({
    options: [makeOption(0), makeOption(1), makeOption(2, { enabled: false })],
    ...overrides,
  });
  return {
    source,
    decision,
    result: select(decision.options, seed),
  };
}

describe('history service', () => {
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

  it('creates and lists a draft snapshot with disabled options preserved', async () => {
    const session = await createGuestSession(testDatabase.db, firstNow);
    const input = makeHistoryInput();

    const created = await createHistoryEntry(testDatabase.db, session.user.id, input, firstNow);
    const listed = await listHistory(testDatabase.db, session.user.id, 10);
    const stored = await testDatabase.db.select().from(decisionSessions);

    expect(listed).toEqual([created]);
    expect(created.source).toEqual({ kind: 'draft' });
    expect(created.title).toBe(input.decision.title);
    expect(created.winner).toEqual(
      input.decision.options.find((option) => option.id === input.result.winnerId),
    );
    expect(stored[0]?.options).toEqual(input.decision.options);
    expect(stored[0]?.options.find((option) => !option.enabled)?.enabled).toBe(false);
  });

  it('rejects a mismatched result without storing a row', async () => {
    const session = await createGuestSession(testDatabase.db, firstNow);
    const input = makeHistoryInput();
    const otherWinner = input.result.candidateIds.find((id) => id !== input.result.winnerId);

    if (!otherWinner) {
      throw new Error('Expected at least two candidates.');
    }

    await expect(
      createHistoryEntry(testDatabase.db, session.user.id, {
        ...input,
        result: { ...input.result, winnerId: otherWinner },
      }),
    ).rejects.toMatchObject<Partial<HttpError>>({
      status: 400,
      code: 'invalid_result',
      message: 'The result does not match the options.',
    });
    expect(await testDatabase.db.select().from(decisionSessions)).toEqual([]);
  });

  it('links only the caller decision and keeps the history row after deletion', async () => {
    const owner = await createGuestSession(testDatabase.db, firstNow);
    const otherUser = await createGuestSession(testDatabase.db, firstNow);
    const ownerDecision = await createDecision(
      testDatabase.db,
      owner.user.id,
      makeDraft(),
      firstNow,
    );
    const otherDecision = await createDecision(
      testDatabase.db,
      otherUser.user.id,
      makeDraft({ title: 'Other' }),
      firstNow,
    );
    const ownerInput = makeHistoryInput(ownerDecision.decision, {
      kind: 'decision',
      decisionId: ownerDecision.decision.id,
    });
    const otherInput = makeHistoryInput(makeDraft({ title: 'Other source' }), {
      kind: 'decision',
      decisionId: otherDecision.decision.id,
    });

    const linked = await createHistoryEntry(testDatabase.db, owner.user.id, ownerInput, firstNow);
    const unlinked = await createHistoryEntry(
      testDatabase.db,
      owner.user.id,
      otherInput,
      new Date(firstNow.getTime() + 1000),
    );

    expect(linked.source).toEqual({ kind: 'decision', decisionId: ownerDecision.decision.id });
    expect(unlinked.source).toEqual({ kind: 'decision', decisionId: null });

    expect(await deleteDecision(testDatabase.db, owner.user.id, ownerDecision.decision.id)).toBe(
      true,
    );
    expect((await listHistory(testDatabase.db, owner.user.id, 10))[1]?.source).toEqual({
      kind: 'decision',
      decisionId: null,
    });
  });

  it('keeps preset sources and isolates ordering and limits by user', async () => {
    const firstUser = await createGuestSession(testDatabase.db, firstNow);
    const secondUser = await createGuestSession(testDatabase.db, firstNow);
    const older = await createHistoryEntry(
      testDatabase.db,
      firstUser.user.id,
      makeHistoryInput({ title: 'Older' }, { kind: 'preset', slug: 'food' }),
      firstNow,
    );
    const newer = await createHistoryEntry(
      testDatabase.db,
      firstUser.user.id,
      makeHistoryInput({ title: 'Newer' }, { kind: 'preset', slug: 'drinks' }),
      new Date(firstNow.getTime() + 1000),
    );
    const other = await createHistoryEntry(
      testDatabase.db,
      secondUser.user.id,
      makeHistoryInput({ title: 'Other' }),
      new Date(firstNow.getTime() + 2000),
    );

    expect(older.source).toEqual({ kind: 'preset', slug: 'food' });
    expect(await listHistory(testDatabase.db, firstUser.user.id, 1)).toEqual([newer]);
    expect(await listHistory(testDatabase.db, firstUser.user.id, 10)).toEqual([newer, older]);
    expect(await listHistory(testDatabase.db, secondUser.user.id, 10)).toEqual([other]);
  });

  it('prunes the oldest entries at the per-user limit without touching another user', async () => {
    const session = await createGuestSession(testDatabase.db, firstNow);
    const otherUser = await createGuestSession(testDatabase.db, firstNow);
    const input = makeHistoryInput();
    const rows = Array.from({ length: DECISION_LIMITS.maxHistoryEntriesPerUser }, (_, index) => ({
      userId: session.user.id,
      source: 'draft' as const,
      decisionId: null,
      presetSlug: null,
      title: `History ${index}`,
      options: input.decision.options,
      result: input.result,
      createdAt: new Date(firstNow.getTime() + index * 1000),
    }));
    await testDatabase.db.insert(decisionSessions).values(rows);
    const otherEntry = await createHistoryEntry(
      testDatabase.db,
      otherUser.user.id,
      input,
      new Date(firstNow.getTime() + 500_000),
    );

    await createHistoryEntry(
      testDatabase.db,
      session.user.id,
      makeHistoryInput({ title: 'Newest' }),
      new Date(firstNow.getTime() + 300_000),
    );

    const ownRows = await testDatabase.db
      .select()
      .from(decisionSessions)
      .where(eq(decisionSessions.userId, session.user.id));
    const ownHistory = await listHistory(testDatabase.db, session.user.id, 10);

    expect(ownRows).toHaveLength(DECISION_LIMITS.maxHistoryEntriesPerUser);
    expect(ownRows.map((row) => row.title)).not.toContain('History 0');
    expect(ownHistory[0]?.title).toBe('Newest');
    expect(await listHistory(testDatabase.db, otherUser.user.id, 10)).toEqual([otherEntry]);
  });

  it('cascades history entries when the user is deleted', async () => {
    const session = await createGuestSession(testDatabase.db, firstNow);
    await createHistoryEntry(testDatabase.db, session.user.id, makeHistoryInput(), firstNow);

    await testDatabase.db.delete(users).where(eq(users.id, session.user.id));

    expect(await testDatabase.db.select().from(decisionSessions)).toEqual([]);
    expect(await testDatabase.db.select().from(decisions)).toEqual([]);
  });
});
