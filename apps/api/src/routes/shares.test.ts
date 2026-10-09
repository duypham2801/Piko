import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';

import {
  select,
  SharedCase,
  SharedCaseListResponse,
  type SharedCaseCreateData,
} from '@piko/domain';

import { FixedWindowRateLimiter } from '../auth/rate-limit.js';
import { createGuestSession, SESSION_COOKIE_NAME } from '../auth/session.service.js';
import { createApp } from '../app.js';
import { users } from '../db/schema.js';
import { createShare, revokeShare } from '../services/shares.service.js';
import { makeDraft, makeOption } from '../test/decisions.fixtures.js';
import { createTestDatabase } from '../test/pglite.js';

const appOrigin = 'http://localhost:5173';

function makeShareInput(): SharedCaseCreateData {
  return {
    decision: makeDraft({
      title: 'Dinner',
      options: [makeOption(0), makeOption(1), makeOption(2)],
    }),
    result: null,
    lifetime: '7d',
  };
}

describe('share routes', () => {
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

  it('requires an existing session for every owner route', async () => {
    const requests: Array<[string, RequestInit]> = [
      ['/api/shares', {}],
      [
        '/api/shares',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Origin: appOrigin },
          body: '{}',
        },
      ],
      [
        '/api/shares/00000000-0000-4000-8000-000000000001',
        { method: 'DELETE', headers: { 'Content-Type': 'application/json', Origin: appOrigin } },
      ],
      [
        '/api/shares/00000000-0000-4000-8000-000000000001/spins',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Origin: appOrigin },
          body: '{}',
        },
      ],
    ];

    for (const [path, init] of requests) {
      const response = await request(path, init);
      expect(response.status).toBe(401);
      expect((await response.json()).error.code).toBe('session_required');
    }
    expect(await testDatabase.db.select({ id: users.id }).from(users)).toEqual([]);
  });

  it('creates, lists, spins, revokes, and then lists an empty owner collection', async () => {
    const cookie = await createSessionCookie();
    const input = makeShareInput();
    const createResponse = await request('/api/shares', {
      method: 'POST',
      headers: mutationHeaders(cookie),
      body: JSON.stringify(input),
    });
    expect(createResponse.status).toBe(201);
    const created = SharedCase.parse(await createResponse.json());

    const listResponse = await request('/api/shares', { headers: { Cookie: cookie } });
    expect(listResponse.status).toBe(200);
    expect(SharedCaseListResponse.parse(await listResponse.json()).shares).toEqual([created]);

    const options = created.options.map((option, index) =>
      index === 2 ? { ...option, enabled: false } : option,
    );
    const spinResponse = await request(`/api/shares/${created.id}/spins`, {
      method: 'POST',
      headers: mutationHeaders(cookie),
      body: JSON.stringify({ options, result: select(options, 7) }),
    });
    expect(spinResponse.status).toBe(200);
    const spun = SharedCase.parse(await spinResponse.json());
    expect(spun.options).toEqual(options);
    expect(spun.result).toEqual(select(options, 7));

    const deleteResponse = await request(`/api/shares/${created.id}`, {
      method: 'DELETE',
      headers: mutationHeaders(cookie),
    });
    expect(deleteResponse.status).toBe(204);
    expect(await deleteResponse.text()).toBe('');

    const emptyResponse = await request('/api/shares', { headers: { Cookie: cookie } });
    expect(SharedCaseListResponse.parse(await emptyResponse.json())).toEqual({ shares: [] });
  });

  it('rejects malformed ids and invalid create bodies', async () => {
    const cookie = await createSessionCookie();
    const malformedOwner = await request('/api/shares/not-a-uuid', {
      method: 'DELETE',
      headers: mutationHeaders(cookie),
    });
    expect(malformedOwner.status).toBe(404);
    expect((await malformedOwner.json()).error.code).toBe('not_found');

    const malformedPublic = await request('/api/public/shares/not-a-uuid');
    expect(malformedPublic.status).toBe(404);
    expect(malformedPublic.headers.get('Cache-Control')).toBe('no-store');

    const invalid = await request('/api/shares', {
      method: 'POST',
      headers: mutationHeaders(cookie),
      body: JSON.stringify({}),
    });
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toEqual({
      error: { code: 'invalid_body', message: 'The shared case is invalid.' },
    });
  });

  it('serves active public data without a session or cookie and disables caching', async () => {
    const owner = await createGuestSession(testDatabase.db);
    const share = await createShare(testDatabase.db, owner.user.id, makeShareInput());
    const userCountBefore = (await testDatabase.db.select({ id: users.id }).from(users)).length;

    const response = await request(`/api/public/shares/${share.id}`);
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('Set-Cookie')).toBeNull();
    expect(SharedCase.parse(await response.json())).toEqual(share);
    expect((await testDatabase.db.select({ id: users.id }).from(users)).length).toBe(
      userCountBefore,
    );

    await revokeShare(testDatabase.db, owner.user.id, share.id);
    const revoked = await request(`/api/public/shares/${share.id}`);
    expect(revoked.status).toBe(404);
    expect(revoked.headers.get('Cache-Control')).toBe('no-store');
    expect(revoked.headers.get('Set-Cookie')).toBeNull();
  });
});
