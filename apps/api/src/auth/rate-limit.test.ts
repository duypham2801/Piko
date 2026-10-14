import { describe, expect, it } from 'vitest';

import { FixedWindowRateLimiter, rateLimitKey } from './rate-limit.js';

describe('rateLimitKey', () => {
  it('keeps IPv4 addresses unchanged', () => {
    expect(rateLimitKey('192.0.2.8')).toBe('192.0.2.8');
  });

  it('collapses IPv4-mapped IPv6 addresses', () => {
    expect(rateLimitKey('::FFFF:192.0.2.8')).toBe('192.0.2.8');
  });

  it('groups IPv6 addresses by canonical /64', () => {
    expect(rateLimitKey('2001:db8:0:1:abcd::1')).toBe('2001:0db8:0000:0001::/64');
    expect(rateLimitKey('2001:db8:0:1:ffff::2')).toBe('2001:0db8:0000:0001::/64');
    expect(rateLimitKey('2001:db8:0:2::1')).toBe('2001:0db8:0000:0002::/64');
  });

  it('expands leading and trailing compressed IPv6 forms', () => {
    expect(rateLimitKey('::1')).toBe('0000:0000:0000:0000::/64');
    expect(rateLimitKey('::abcd')).toBe('0000:0000:0000:0000::/64');
  });

  it('drops IPv6 zone identifiers', () => {
    expect(rateLimitKey('fe80::1%eth0')).toBe('fe80:0000:0000:0000::/64');
  });

  it('keeps malformed or unknown values unchanged', () => {
    expect(rateLimitKey('not-an-ip')).toBe('not-an-ip');
    expect(rateLimitKey('2001:::1')).toBe('2001:::1');
  });
});

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
