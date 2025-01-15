/**
 * Fixed-window attempt counter for log-in throttling.
 *
 * In memory, so each server instance counts separately. That is enough to
 * blunt casual password guessing on a demo; a multi-instance deployment
 * should back this with Redis or a database table.
 */
export class RateLimiter {
  private hits = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  /** Records one attempt and reports whether it is still within the limit. */
  attempt(key: string, now = Date.now()): { ok: boolean; retryAfterMs: number } {
    const entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
      this.sweep(now);
      return { ok: true, retryAfterMs: 0 };
    }
    entry.count += 1;
    return entry.count <= this.limit
      ? { ok: true, retryAfterMs: 0 }
      : { ok: false, retryAfterMs: entry.resetAt - now };
  }

  reset(key: string) {
    this.hits.delete(key);
  }

  private sweep(now: number) {
    if (this.hits.size < 1000) return;
    for (const [key, entry] of this.hits) if (entry.resetAt <= now) this.hits.delete(key);
  }
}

/** 10 log-in attempts per email per 15 minutes; a successful log-in clears it. */
export const loginLimiter = new RateLimiter(10, 15 * 60 * 1000);
