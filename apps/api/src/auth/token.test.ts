import { describe, expect, it } from 'vitest';

import { generateSessionToken, hashSessionToken } from './token.js';

describe('session tokens', () => {
  it('generates a 32-byte base64url token', () => {
    const token = generateSessionToken();

    expect(token).toHaveLength(43);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('generates different tokens', () => {
    expect(generateSessionToken()).not.toBe(generateSessionToken());
  });

  it('hashes deterministically to a 64-character hex string', () => {
    const hash = hashSessionToken('token');

    expect(hash).toBe(hashSessionToken('token'));
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
