import { describe, expect, it } from 'vitest';

import { envSchema, loadEnv } from './env.js';

const baseEnv = (overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv => ({
  NODE_ENV: 'development',
  DATABASE_URL: 'postgres://piko:piko@db:5432/piko',
  APP_ORIGIN: 'http://localhost:5173',
  COOKIE_SECURE: 'false',
  TRUST_PROXY: 'false',
  ...overrides,
});

function expectExtraOriginIssue(result: ReturnType<typeof envSchema.safeParse>) {
  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: ['DEV_EXTRA_ORIGINS'] })]),
    );
  }
}

describe('environment configuration', () => {
  it('defaults DEV_EXTRA_ORIGINS to an empty list when absent', () => {
    expect(loadEnv(baseEnv()).DEV_EXTRA_ORIGINS).toEqual([]);
  });

  it('defaults an empty DEV_EXTRA_ORIGINS value to an empty list', () => {
    expect(loadEnv(baseEnv({ DEV_EXTRA_ORIGINS: '' })).DEV_EXTRA_ORIGINS).toEqual([]);
  });

  it('splits, trims and drops empty extra origins in order', () => {
    expect(
      loadEnv(
        baseEnv({
          DEV_EXTRA_ORIGINS: ' http://192.168.1.100:5173 , https://dp-1.example.ts.net ',
        }),
      ).DEV_EXTRA_ORIGINS,
    ).toEqual(['http://192.168.1.100:5173', 'https://dp-1.example.ts.net']);
  });

  it('rejects an extra origin with a path', () => {
    expectExtraOriginIssue(
      envSchema.safeParse(baseEnv({ DEV_EXTRA_ORIGINS: 'https://dp-1.example.ts.net/app' })),
    );
  });

  it('rejects an extra origin that is not a URL', () => {
    expectExtraOriginIssue(envSchema.safeParse(baseEnv({ DEV_EXTRA_ORIGINS: 'not-a-url' })));
  });

  it('rejects an extra origin with an unsupported protocol', () => {
    expectExtraOriginIssue(
      envSchema.safeParse(baseEnv({ DEV_EXTRA_ORIGINS: 'ftp://example.com' })),
    );
  });

  it.each(['production', 'test'])('rejects extra origins in %s', (nodeEnv) => {
    expectExtraOriginIssue(
      envSchema.safeParse(
        baseEnv({
          NODE_ENV: nodeEnv,
          DEV_EXTRA_ORIGINS: 'https://dp-1.example.ts.net',
        }),
      ),
    );
  });
});
