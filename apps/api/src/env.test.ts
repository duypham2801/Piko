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

describe('environment configuration', () => {
  it('accepts and returns DEV_LAN_ORIGIN in development', () => {
    const origin = 'http://192.168.1.100:5173';

    expect(loadEnv(baseEnv({ DEV_LAN_ORIGIN: origin })).DEV_LAN_ORIGIN).toBe(origin);
  });

  it('accepts development without DEV_LAN_ORIGIN', () => {
    expect(loadEnv(baseEnv()).DEV_LAN_ORIGIN).toBeUndefined();
  });

  it.each(['production', 'test'])('rejects DEV_LAN_ORIGIN in %s', (nodeEnv) => {
    const result = envSchema.safeParse(
      baseEnv({ NODE_ENV: nodeEnv, DEV_LAN_ORIGIN: 'http://192.168.1.100:5173' }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: ['DEV_LAN_ORIGIN'] })]),
      );
    }
  });

  it('rejects a malformed DEV_LAN_ORIGIN in development', () => {
    const result = envSchema.safeParse(baseEnv({ DEV_LAN_ORIGIN: 'not-a-url' }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: ['DEV_LAN_ORIGIN'] })]),
      );
    }
  });
});
