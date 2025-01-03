import { describe, expect, it } from "vitest";

import { STATUSES, allowedTransitions, canTransition, isStatus, transitionError } from "./status";

describe("status transitions", () => {
  it("lets an application move forward and skip stages", () => {
    expect(canTransition("wishlist", "applied")).toBe(true);
    expect(canTransition("applied", "interview")).toBe(true);
    expect(canTransition("applied", "offer")).toBe(true);
    expect(canTransition("interview", "offer")).toBe(true);
  });

  it("refuses backwards moves", () => {
    expect(canTransition("interview", "applied")).toBe(false);
    expect(canTransition("offer", "interview")).toBe(false);
    expect(canTransition("applied", "wishlist")).toBe(false);
    expect(transitionError("offer", "applied")).toMatch(/can't move back/i);
  });

  it("only rejects applications that were submitted", () => {
    expect(canTransition("wishlist", "rejected")).toBe(false);
    expect(transitionError("wishlist", "rejected")).toMatch(/only submitted/i);
    for (const from of ["applied", "interview", "offer"] as const) {
      expect(canTransition(from, "rejected")).toBe(true);
    }
  });

  it("reopens a rejected application only as applied", () => {
    expect(allowedTransitions("rejected")).toEqual(["applied"]);
    expect(transitionError("rejected", "offer")).toMatch(/reopened/i);
  });

  it("treats a same-status move as an error, not a transition", () => {
    for (const s of STATUSES) {
      expect(canTransition(s, s)).toBe(false);
      expect(allowedTransitions(s)).not.toContain(s);
      expect(transitionError(s, s)).toMatch(/already/i);
    }
  });

  it("has a reachable path from wishlist to every stage", () => {
    const seen = new Set(["wishlist"]);
    const queue = ["wishlist" as const] as (typeof STATUSES)[number][];
    while (queue.length) {
      for (const next of allowedTransitions(queue.shift()!)) {
        if (!seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      }
    }
    expect([...seen].sort()).toEqual([...STATUSES].sort());
  });

  it("validates unknown input", () => {
    expect(isStatus("offer")).toBe(true);
    expect(isStatus("ghosted")).toBe(false);
    expect(isStatus(undefined)).toBe(false);
  });
});
