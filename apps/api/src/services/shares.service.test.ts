import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';

import {
  DECISION_LIMITS,
  select,
  type DecisionDraftData,
  type SharedCaseCreateData,
} from '@piko/domain';

import { createGuestSession } from '../auth/session.service.js';
import { sharedCases, users } from '../db/schema.js';
import { HttpError } from '../lib/errors.js';
import {
  createShare,
  getPublicShare,
  listShares,
  recordShareSpin,
  revokeShare,
} from './shares.service.js';
import { makeDraft, makeOption } from '../test/decisions.fixtures.js';
import { createTestDatabase } from '../test/pglite.js';

const firstNow = new Date('2026-01-01T00:00:00.000Z');
const nextNow = new Date('2026-01-02T00:00:00.000Z');
const weekLater = new Date('2026-01-08T00:00:00.000Z');

function makeShareInput(
  overrides: {
    decision?: Partial<DecisionDraftData>;
    result?: SharedCaseCreateData['result'];
    lifetime?: SharedCaseCreateData['lifetime'];
  } = {},
): SharedCaseCreateData {
  const decision = makeDraft({
    title: 'Dinner',
    options: [makeOption(0), makeOption(1), makeOption(2, { enabled: false })],
    ...overrides.decision,
  });
  return {
    decision,
    result: overrides.result === undefined ? select(decision.options, 42) : overrides.result,
    lifetime: overrides.lifetime ?? '7d',
  };
}

describe('share service', () => {
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

  it('creates result and expiry snapshots, including never-expiring and unspun cases', async () => {
    const session = await createGuestSession(testDatabase.db, firstNow);
    const created = await createShare(
      testDatabase.db,
      session.user.id,
      makeShareInput({ decision: { category: 'food' } }),
      firstNow,
    );

    expect(created.result).toEqual(select(created.options, 42));
    expect(created.spunAt).toBe(firstNow.toISOString());
    expect(created.expiresAt).toBe(weekLater.toISOString());
    expect(created).toMatchObject({ title: 'Dinner', category: 'food' });

    const never = await createShare(
      testDatabase.db,
      session.user.id,
      makeShareInput({ result: null, lifetime: 'never' }),
      firstNow,
    );
    expect(never.result).toBeNull();
    expect(never.spunAt).toBeNull();
    expect(never.expiresAt).toBeNull();
  });

  it('rejects a mismatched result before storing anything', async () => {
    const session = await createGuestSession(testDatabase.db, firstNow);
    const input = makeShareInput();
    const otherWinner = input.result?.candidateIds.find((id) => id !== input.result?.winnerId);
    if (!input.result || !otherWinner) {
      throw new Error('Expected a result with another candidate.');
    }

    await expect(
      createShare(testDatabase.db, session.user.id, {
        ...input,
        result: { ...input.result, winnerId: otherWinner },
      }),
    ).rejects.toMatchObject<Partial<HttpError>>({
      status: 400,
      code: 'invalid_result',
      message: 'The result does not match the options.',
    });
    expect(await testDatabase.db.select().from(sharedCases)).toEqual([]);
  });

  it('cleans expired rows before enforcing the active share limit', async () => {
    const session = await createGuestSession(testDatabase.db, firstNow);
    const input = makeShareInput({ result: null });
    await testDatabase.db.insert(sharedCases).values(
      Array.from({ length: DECISION_LIMITS.maxActiveSharesPerUser }, (_, index) => ({
        userId: session.user.id,
        title: `Share ${index}`,
        category: null,
        options: input.decision.options,
        result: null,
        spunAt: null,
        createdAt: firstNow,
        expiresAt: index === 0 ? new Date(firstNow.getTime() - 1) : nextNow,
      })),
    );

    const created = await createShare(testDatabase.db, session.user.id, input, firstNow);
    expect(created).toBeDefined();
    expect(
      await testDatabase.db
        .select()
        .from(sharedCases)
        .where(eq(sharedCases.userId, session.user.id)),
    ).toHaveLength(DECISION_LIMITS.maxActiveSharesPerUser);
  });

  it('rejects creation at the active share limit', async () => {
    const session = await createGuestSession(testDatabase.db, firstNow);
    const input = makeShareInput({ result: null });
    await testDatabase.db.insert(sharedCases).values(
      Array.from({ length: DECISION_LIMITS.maxActiveSharesPerUser }, (_, index) => ({
        userId: session.user.id,
        title: `Share ${index}`,
        category: null,
        options: input.decision.options,
        result: null,
        spunAt: null,
        createdAt: firstNow,
        expiresAt: nextNow,
      })),
    );

    await expect(
      createShare(testDatabase.db, session.user.id, input, firstNow),
    ).rejects.toMatchObject<Partial<HttpError>>({
      status: 409,
      code: 'share_limit_reached',
      message: 'The share limit has been reached.',
    });
  });

  it('lists only active shares for the caller in newest-first order', async () => {
    const owner = await createGuestSession(testDatabase.db, firstNow);
    const other = await createGuestSession(testDatabase.db, firstNow);
    const input = makeShareInput({ result: null });
    const older = await createShare(testDatabase.db, owner.user.id, input, firstNow);
    const newer = await createShare(testDatabase.db, owner.user.id, input, nextNow);
    await createShare(testDatabase.db, other.user.id, input, new Date('2026-01-03T00:00:00.000Z'));
    await testDatabase.db
      .update(sharedCases)
      .set({ expiresAt: firstNow })
      .where(eq(sharedCases.id, older.id));

    expect(await listShares(testDatabase.db, owner.user.id, nextNow)).toEqual([newer]);
    expect(await listShares(testDatabase.db, other.user.id, nextNow)).toHaveLength(1);
  });

  it('revokes only the owner share and returns not_found otherwise', async () => {
    const owner = await createGuestSession(testDatabase.db, firstNow);
    const other = await createGuestSession(testDatabase.db, firstNow);
    const share = await createShare(testDatabase.db, owner.user.id, makeShareInput(), firstNow);

    await expect(revokeShare(testDatabase.db, other.user.id, share.id)).rejects.toMatchObject<
      Partial<HttpError>
    >({ status: 404, code: 'not_found' });
    expect(await getPublicShare(testDatabase.db, share.id, firstNow)).toEqual(share);

    await expect(revokeShare(testDatabase.db, owner.user.id, share.id)).resolves.toBeUndefined();
    await expect(getPublicShare(testDatabase.db, share.id, firstNow)).rejects.toMatchObject<
      Partial<HttpError>
    >({ status: 404, code: 'not_found' });
    await expect(
      revokeShare(testDatabase.db, owner.user.id, '00000000-0000-4000-8000-000000000099'),
    ).rejects.toMatchObject<Partial<HttpError>>({ status: 404, code: 'not_found' });
  });

  it('records a valid spin while preserving the option set', async () => {
    const session = await createGuestSession(testDatabase.db, firstNow);
    const created = await createShare(
      testDatabase.db,
      session.user.id,
      makeShareInput({ result: null }),
      firstNow,
    );
    const options = created.options.map((option, index) =>
      index === 2 ? { ...option, enabled: false } : option,
    );
    const result = select(options, 7);
    const spunAt = new Date('2026-01-01T01:00:00.000Z');
    const updated = await recordShareSpin(
      testDatabase.db,
      session.user.id,
      created.id,
      { options, result },
      spunAt,
    );

    expect(updated.options).toEqual(options);
    expect(updated.result).toEqual(result);
    expect(updated.spunAt).toBe(spunAt.toISOString());
  });

  it('rejects changed, missing, or reordered options and mismatched results', async () => {
    const session = await createGuestSession(testDatabase.db, firstNow);
    const created = await createShare(
      testDatabase.db,
      session.user.id,
      makeShareInput({ result: null }),
      firstNow,
    );
    const validResult = select(created.options, 7);
    const invalidOptions = [
      created.options.map((option, index) =>
        index === 0 ? { ...option, label: 'Changed' } : option,
      ),
      created.options.map((option, index) =>
        index === 0 ? { ...option, weight: option.weight + 1 } : option,
      ),
      created.options.slice(0, -1),
      [...created.options].reverse(),
    ];

    for (const options of invalidOptions) {
      await expect(
        recordShareSpin(
          testDatabase.db,
          session.user.id,
          created.id,
          {
            options,
            result: validResult,
          },
          firstNow,
        ),
      ).rejects.toMatchObject<Partial<HttpError>>({
        status: 400,
        code: 'invalid_options',
        message: 'The options do not match the shared case.',
      });
    }

    const otherWinner = validResult.candidateIds.find((id) => id !== validResult.winnerId);
    if (!otherWinner) {
      throw new Error('Expected a second candidate.');
    }
    await expect(
      recordShareSpin(
        testDatabase.db,
        session.user.id,
        created.id,
        {
          options: created.options,
          result: { ...validResult, winnerId: otherWinner },
        },
        firstNow,
      ),
    ).rejects.toMatchObject<Partial<HttpError>>({
      status: 400,
      code: 'invalid_result',
      message: 'The result does not match the options.',
    });
  });

  it('rejects spins for another user and expired shares, and cascades with the user', async () => {
    const owner = await createGuestSession(testDatabase.db, firstNow);
    const other = await createGuestSession(testDatabase.db, firstNow);
    const input = makeShareInput({ result: null });
    const share = await createShare(testDatabase.db, owner.user.id, input, firstNow);
    const spin = { options: share.options, result: select(share.options, 1) };

    await expect(
      recordShareSpin(testDatabase.db, other.user.id, share.id, spin, firstNow),
    ).rejects.toMatchObject<Partial<HttpError>>({ status: 404, code: 'not_found' });

    const expired = await createShare(testDatabase.db, owner.user.id, input, firstNow);
    await testDatabase.db
      .update(sharedCases)
      .set({ expiresAt: firstNow })
      .where(eq(sharedCases.id, expired.id));
    await expect(
      recordShareSpin(testDatabase.db, owner.user.id, expired.id, spin, firstNow),
    ).rejects.toMatchObject<Partial<HttpError>>({ status: 404, code: 'not_found' });

    await testDatabase.db.delete(users).where(eq(users.id, owner.user.id));
    expect(await testDatabase.db.select().from(sharedCases)).toEqual([]);
  });

  it('returns active public data without exposing the owner', async () => {
    const owner = await createGuestSession(testDatabase.db, firstNow);
    const share = await createShare(testDatabase.db, owner.user.id, makeShareInput(), firstNow);

    const publicShare = await getPublicShare(testDatabase.db, share.id, firstNow);
    expect(publicShare).toEqual(share);
    expect(publicShare).not.toHaveProperty('userId');

    const expired = await createShare(testDatabase.db, owner.user.id, makeShareInput(), firstNow);
    await testDatabase.db
      .update(sharedCases)
      .set({ expiresAt: firstNow })
      .where(eq(sharedCases.id, expired.id));
    await expect(getPublicShare(testDatabase.db, expired.id, firstNow)).rejects.toMatchObject<
      Partial<HttpError>
    >({ status: 404, code: 'not_found' });
    await expect(
      getPublicShare(testDatabase.db, '00000000-0000-4000-8000-000000000099', firstNow),
    ).rejects.toMatchObject<Partial<HttpError>>({ status: 404, code: 'not_found' });
  });
});
