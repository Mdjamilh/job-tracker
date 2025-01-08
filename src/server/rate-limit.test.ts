import { describe, expect, it } from "vitest";

import { RateLimiter } from "./rate-limit";

describe("RateLimiter", () => {
  it("allows up to the limit, then blocks until the window resets", () => {
    const limiter = new RateLimiter(3, 1000);
    expect([1, 2, 3].map(() => limiter.attempt("a", 0).ok)).toEqual([true, true, true]);
    expect(limiter.attempt("a", 500)).toEqual({ ok: false, retryAfterMs: 500 });
    expect(limiter.attempt("a", 1000).ok).toBe(true);
  });

  it("tracks keys independently and can be reset", () => {
    const limiter = new RateLimiter(1, 1000);
    limiter.attempt("a", 0);
    expect(limiter.attempt("a", 1).ok).toBe(false);
    expect(limiter.attempt("b", 1).ok).toBe(true);
    limiter.reset("a");
    expect(limiter.attempt("a", 2).ok).toBe(true);
  });
});
