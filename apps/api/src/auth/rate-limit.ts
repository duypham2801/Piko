import { isIP } from 'node:net';

function expandIPv6(value: string): string[] | null {
  let address = value;
  const lastColon = address.lastIndexOf(':');
  const ipv4Part = address.slice(lastColon + 1);

  if (ipv4Part.includes('.')) {
    if (isIP(ipv4Part) !== 4 || lastColon < 0) return null;

    const octets = ipv4Part.split('.').map(Number);
    const high = ((octets[0] ?? 0) << 8) | (octets[1] ?? 0);
    const low = ((octets[2] ?? 0) << 8) | (octets[3] ?? 0);
    address = `${address.slice(0, lastColon + 1)}${high.toString(16)}:${low.toString(16)}`;
  }

  if ((address.match(/::/g) ?? []).length > 1) return null;

  const hasCompression = address.includes('::');
  const [left = '', right = ''] = hasCompression ? address.split('::') : [address, ''];
  const leftGroups = left ? left.split(':') : [];
  const rightGroups = right ? right.split(':') : [];
  const allGroups = [...leftGroups, ...rightGroups];

  if (
    allGroups.some((group) => !/^[0-9a-f]{1,4}$/i.test(group)) ||
    (hasCompression ? allGroups.length >= 8 : allGroups.length !== 8)
  ) {
    return null;
  }

  const missingGroups = hasCompression ? 8 - allGroups.length : 0;
  return [...leftGroups, ...Array.from({ length: missingGroups }, () => '0'), ...rightGroups].map(
    (group) => group.padStart(4, '0').toLowerCase(),
  );
}

export function rateLimitKey(ip: string): string {
  if (isIP(ip) === 4) return ip;

  const withoutZone = ip.split('%', 1)[0] ?? ip;
  if (isIP(withoutZone) !== 6) return ip;

  const groups = expandIPv6(withoutZone);
  if (!groups) return ip;

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
