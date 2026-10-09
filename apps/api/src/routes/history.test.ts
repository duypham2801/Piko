import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';

import { HistoryEntry, HistoryListResponse, select } from '@piko/domain';

import { FixedWindowRateLimiter } from '../auth/rate-limit.js';
import { createGuestSession, SESSION_COOKIE_NAME } from '../auth/session.service.js';
import { createApp } from '../app.js';
import { users } from '../db/schema.js';
import { makeDraft, makeOption } from '../test/decisions.fixtures.js';
import { createTestDatabase } from '../test/pglite.js';

const appOrigin = 'http://localhost:5173';

function makeHistoryInput(title = 'Dinner') {
  const decision = makeDraft({
    title,
    options: [makeOption(0), makeOption(1), makeOption(2, { enabled: false })],
  });
  return {
    source: { kind: 'draft' as const },
    decision,
    result: select(decision.options, 42),
  };
}

describe('history routes', () => {
  let testDatabase: Awaited<ReturnType<typeof createTestDatabase>>;
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    testDatabase = await createTestDatabase();
    app = createApp(
      {
        nodeEnv: 'test',
        appOrigin,
        cookieSecure: false,
        trustProxy: false,
        appVersion: 'test',
        guestRateLimitPerHour: 10,
      },
      {
        db: testDatabase.db,
        sql: { unsafe: async () => [] },
        limiter: new FixedWindowRateLimiter({ limit: 10 }),
      },
    );
  });

  afterAll(async () => {
    await testDatabase.close();
  });

  beforeEach(async () => {
    await testDatabase.db.delete(users);
  });

  async function request(path: string, init: RequestInit = {}): Promise<Response> {
    return app.request(new Request(`http://localhost${path}`, init));
  }

  async function createSessionCookie(): Promise<string> {
    const session = await createGuestSession(testDatabase.db);
    return `${SESSION_COOKIE_NAME}=${session.token}`;
  }

  function mutationHeaders(cookie: string): HeadersInit {
    return {
      Cookie: cookie,
      'Content-Type': 'application/json',
      Origin: appOrigin,
    };
  }

  it('requires an existing session without creating a guest', async () => {
    const response = await request('/api/history');

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: { code: 'session_required', message: 'A session is required.' },
    });
    expect(await testDatabase.db.select({ id: users.id }).from(users)).toEqual([]);
  });

  it('rejects malformed JSON, invalid bodies, and mismatched results', async () => {
    const cookie = await createSessionCookie();
    const headers = mutationHeaders(cookie);
    const malformed = await request('/api/history', {
      method: 'POST',
      headers,
      body: '{',
    });
    expect(malformed.status).toBe(400);
    expect((await malformed.json()).error.code).toBe('invalid_json');

    const invalid = await request('/api/history', {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    });
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toEqual({
      error: { code: 'invalid_body', message: 'The history entry is invalid.' },
    });

    const input = makeHistoryInput();
    const otherWinner = input.result.candidateIds.find((id) => id !== input.result.winnerId);
    if (!otherWinner) {
      throw new Error('Expected at least two candidates.');
    }
    const mismatch = await request('/api/history', {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...input, result: { ...input.result, winnerId: otherWinner } }),
    });
    expect(mismatch.status).toBe(400);
    expect(await mismatch.json()).toEqual({
      error: { code: 'invalid_result', message: 'The result does not match the options.' },
    });
  });

  it('creates a valid entry and returns typed history responses', async () => {
    const cookie = await createSessionCookie();
    const input = makeHistoryInput();
    const createResponse = await request('/api/history', {
      method: 'POST',
      headers: mutationHeaders(cookie),
      body: JSON.stringify(input),
    });

    expect(createResponse.status).toBe(201);
    const entry = HistoryEntry.parse(await createResponse.json());
    expect(entry.source).toEqual({ kind: 'draft' });
    expect(entry.title).toBe(input.decision.title);

    const listResponse = await request('/api/history?limit=1', { headers: { Cookie: cookie } });
    expect(listResponse.status).toBe(200);
    const list = HistoryListResponse.parse(await listResponse.json());
    expect(list.entries).toEqual([entry]);
  });

  it('validates the history limit query', async () => {
    const cookie = await createSessionCookie();

    for (const limit of ['0', 'abc']) {
      const response = await request(`/api/history?limit=${limit}`, {
        headers: { Cookie: cookie },
      });
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: { code: 'invalid_query', message: 'The query is invalid.' },
      });
    }
  });

  it('returns only the requested number of newest entries', async () => {
    const cookie = await createSessionCookie();
    const headers = mutationHeaders(cookie);

    for (const title of ['Older', 'Newer']) {
      const response = await request('/api/history', {
        method: 'POST',
        headers,
        body: JSON.stringify(makeHistoryInput(title)),
      });
      expect(response.status).toBe(201);
    }

    const response = await request('/api/history?limit=1', { headers: { Cookie: cookie } });
    const parsed = HistoryListResponse.parse(await response.json());
    expect(parsed.entries).toHaveLength(1);
  });
});
