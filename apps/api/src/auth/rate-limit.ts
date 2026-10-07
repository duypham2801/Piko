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
