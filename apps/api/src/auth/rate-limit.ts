import { isIP } from 'node:net';

// Expands an address that `isIP` already accepted as IPv6 into 8 lower-case 4-digit groups.
function expandIPv6(value: string): string[] {
  let address = value;
  const lastColon = address.lastIndexOf(':');
  const tail = address.slice(lastColon + 1);
  if (tail.includes('.')) {
    const [a = 0, b = 0, c = 0, d = 0] = tail.split('.').map(Number);
    address = `${address.slice(0, lastColon + 1)}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }

  const [left = '', right] = address.split('::');
  const leftGroups = left ? left.split(':') : [];
  const rightGroups = right ? right.split(':') : [];
  const zeros = Array.from({ length: 8 - leftGroups.length - rightGroups.length }, () => '0');
  return [...leftGroups, ...zeros, ...rightGroups].map((group) =>
    group.padStart(4, '0').toLowerCase(),
  );
}

/** IPv4 stays as is; IPv6 is keyed by its /64, since one host usually controls a whole /64. */
export function rateLimitKey(ip: string): string {
  if (isIP(ip) === 4) return ip;

  const withoutZone = ip.split('%', 1)[0] ?? ip;
  if (isIP(withoutZone) !== 6) return ip;

  const groups = expandIPv6(withoutZone);
  if (groups.slice(0, 5).every((group) => group === '0000') && groups[5] === 'ffff') {
    const high = Number.parseInt(groups[6] ?? '0', 16);
    const low = Number.parseInt(groups[7] ?? '0', 16);
    return [high >> 8, high & 0xff, low >> 8, low & 0xff].join('.');
  }

  return `${groups.slice(0, 4).join(':')}::/64`;
}

type Clock = () => number;

interface WindowEntry {
  count: number;
  resetAt: number;
}

export interface FixedWindowRateLimiterOptions {
  limit: number;
  windowMs?: number;
  now?: Clock;
}

export class FixedWindowRateLimiter {
  private readonly entries = new Map<string, WindowEntry>();
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly now: Clock;

  public constructor({
    limit,
    windowMs = 60 * 60 * 1000,
    now = Date.now,
  }: FixedWindowRateLimiterOptions) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.now = now;
  }

  public consume(key: string): boolean {
    const currentTime = this.now();
    this.prune(currentTime);

    const current = this.entries.get(key);
    if (!current || current.resetAt <= currentTime) {
      this.entries.set(key, { count: 1, resetAt: currentTime + this.windowMs });
      return this.limit > 0;
    }

    if (current.count >= this.limit) {
      return false;
    }

    current.count += 1;
    return true;
  }

  public get size(): number {
    this.prune(this.now());
    return this.entries.size;
  }

  private prune(currentTime: number): void {
    for (const [key, entry] of this.entries) {
      if (entry.resetAt <= currentTime) {
        this.entries.delete(key);
      }
    }
  }
}
