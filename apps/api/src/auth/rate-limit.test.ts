import { describe, expect, it } from 'vitest';

import { FixedWindowRateLimiter } from './rate-limit.js';

describe('FixedWindowRateLimiter', () => {
  it('allows requests under the limit and the limit itself', () => {
    const limiter = new FixedWindowRateLimiter({ limit: 3, now: () => 0 });

    expect(limiter.consume('ip')).toBe(true);
    expect(limiter.consume('ip')).toBe(true);
    expect(limiter.consume('ip')).toBe(true);
    expect(limiter.consume('ip')).toBe(false);
  });

  it('resets after the fixed window using an injected clock', () => {
    let now = 0;
    const limiter = new FixedWindowRateLimiter({ limit: 1, windowMs: 100, now: () => now });

    expect(limiter.consume('ip')).toBe(true);
    expect(limiter.consume('ip')).toBe(false);
    now = 100;
    expect(limiter.consume('ip')).toBe(true);
  });

  it('keeps keys isolated per IP', () => {
    const limiter = new FixedWindowRateLimiter({ limit: 1, now: () => 0 });

    expect(limiter.consume('10.0.0.1')).toBe(true);
    expect(limiter.consume('10.0.0.1')).toBe(false);
    expect(limiter.consume('10.0.0.2')).toBe(true);
  });

  it('prunes expired keys on access', () => {
    let now = 0;
    const limiter = new FixedWindowRateLimiter({ limit: 1, windowMs: 100, now: () => now });

    expect(limiter.consume('old')).toBe(true);
    expect(limiter.size).toBe(1);
    now = 100;
    expect(limiter.consume('new')).toBe(true);
    expect(limiter.size).toBe(1);
  });
});
