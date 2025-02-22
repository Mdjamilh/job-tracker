import { describe, expect, it } from "vitest";

import { isDemoToken, signDemoToken, verifyDemoToken } from "./demo-session";

const key = "k".repeat(32);
const userId = "5eed0000-0000-4000-8000-000000000001";
const now = new Date("2026-10-23T12:00:00Z");
const later = new Date("2026-11-22T12:00:00Z");

describe("demo session tokens", () => {
  it("round-trips a signed user id", () => {
    const token = signDemoToken(userId, later, key);
    expect(isDemoToken(token)).toBe(true);
    expect(verifyDemoToken(token, now, key)).toBe(userId);
  });

  it("rejects expired tokens", () => {
    const token = signDemoToken(userId, later, key);
    expect(verifyDemoToken(token, new Date(later.getTime() + 1), key)).toBeNull();
  });

  it("rejects a token signed with another key", () => {
    const token = signDemoToken(userId, later, "x".repeat(32));
    expect(verifyDemoToken(token, now, key)).toBeNull();
  });

  it("rejects tampering with the user id or expiry", () => {
    const token = signDemoToken(userId, later, key);
    const otherUser = token.replace(userId, "5eed0000-0000-4000-8000-000000000002");
    const longer = token.replace(String(later.getTime()), String(later.getTime() + 1e10));
    expect(verifyDemoToken(otherUser, now, key)).toBeNull();
    expect(verifyDemoToken(longer, now, key)).toBeNull();
  });

  it("rejects malformed input", () => {
    for (const bad of ["", "d.", "d.a.b", "d.a.b.c.d", "not-a-demo-token", `d.${"a".repeat(300)}`]) {
      expect(verifyDemoToken(bad, now, key)).toBeNull();
    }
  });
});
