import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';

import { DecisionRecord, ApiError } from '@piko/domain';

import { FixedWindowRateLimiter } from '../auth/rate-limit.js';
import { createApp } from '../app.js';
import { createGuestSession, SESSION_COOKIE_NAME } from '../auth/session.service.js';
import { users } from '../db/schema.js';
import { makeDraft } from '../test/decisions.fixtures.js';
import { createTestDatabase } from '../test/pglite.js';

const appOrigin = 'http://localhost:5173';

describe('decision routes', () => {
  let testDatabase: Awaited<ReturnType<typeof createTestDatabase>>;
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    testDatabase = await createTestDatabase();
    app = createApp(
      {
        nodeEnv: 'test',
        appOrigin,
        additionalAppOrigins: ['http://192.168.6.28:5173', 'https://dp-1.example.ts.net'],
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
    const response = await request('/api/decisions');

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: { code: 'session_required', message: 'A session is required.' },
    });
    expect(await testDatabase.db.select({ id: users.id }).from(users)).toEqual([]);
  });

  it('accepts the configured LAN origin and rejects another origin for writes', async () => {
    const cookie = await createSessionCookie();
    const body = JSON.stringify(makeDraft({ category: 'food' }));
    for (const origin of ['http://192.168.6.28:5173', 'https://dp-1.example.ts.net']) {
      const allowed = await request('/api/decisions', {
        method: 'POST',
        headers: { ...mutationHeaders(cookie), Origin: origin },
        body,
      });
      expect(allowed.status).toBe(201);
    }

    const denied = await request('/api/decisions', {
      method: 'POST',
      headers: { ...mutationHeaders(cookie), Origin: 'http://192.168.6.29:5173' },
      body,
    });
    expect(denied.status).toBe(403);
    expect((await denied.json()).error.code).toBe('csrf_failed');
  });

  it('returns not_found for an invalid decision UUID', async () => {
    const cookie = await createSessionCookie();
    const response = await request('/api/decisions/not-a-uuid', { headers: { Cookie: cookie } });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toEqual({
      error: { code: 'not_found', message: 'The requested resource was not found.' },
    });
    expect(ApiError.parse(body)).toEqual(body);
  });

  it('rejects malformed JSON, invalid bodies, and oversized bodies', async () => {
    const cookie = await createSessionCookie();
    const headers = mutationHeaders(cookie);

    const malformed = await request('/api/decisions', { method: 'POST', headers, body: '{' });
    expect(malformed.status).toBe(400);
    expect((await malformed.json()).error.code).toBe('invalid_json');

    const invalid = await request('/api/decisions', {
      method: 'POST',
      headers,
      body: JSON.stringify({ title: 'Dinner', options: [] }),
    });
    expect(invalid.status).toBe(400);
    expect((await invalid.json()).error).toEqual({
      code: 'invalid_body',
      message: 'The decision is invalid.',
    });

    const oversized = await request('/api/decisions', {
      method: 'POST',
      headers,
      body: 'x'.repeat(16 * 1024 + 1),
    });
    expect(oversized.status).toBe(413);
    expect(await oversized.json()).toEqual({
      error: { code: 'payload_too_large', message: 'The request body is too large.' },
    });
  });

  it('creates and deletes a decision with typed response data', async () => {
    const cookie = await createSessionCookie();
    const createResponse = await request('/api/decisions', {
      method: 'POST',
      headers: mutationHeaders(cookie),
      body: JSON.stringify(makeDraft({ category: 'food' })),
    });

    expect(createResponse.status).toBe(201);
    const parsed = DecisionRecord.safeParse(await createResponse.json());
    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      return;
    }
    expect(parsed.data.decision.category).toBe('food');

    const deleteResponse = await request(`/api/decisions/${parsed.data.decision.id}`, {
      method: 'DELETE',
      headers: mutationHeaders(cookie),
    });
    expect(deleteResponse.status).toBe(204);
    expect(await deleteResponse.text()).toBe('');

    const getResponse = await request(`/api/decisions/${parsed.data.decision.id}`, {
      headers: { Cookie: cookie },
    });
    expect(getResponse.status).toBe(404);
  });
});
