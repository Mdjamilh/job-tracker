import { describe, expect, it } from "vitest";

import { formatPercent, funnel, weeklyCounts } from "./stats";

describe("weeklyCounts", () => {
  it("buckets by Monday-start week, zero-fills and drops older dates", () => {
    const weeks = weeklyCounts(
      ["2026-10-19", "2026-10-23", "2026-10-25", "2026-10-12", "2026-08-01", null],
      "2026-10-23",
      3,
    );
    expect(weeks).toEqual([
      { weekStart: "2026-10-05", count: 0 },
      { weekStart: "2026-10-12", count: 1 },
      { weekStart: "2026-10-19", count: 3 },
    ]);
  });
});

describe("funnel", () => {
  it("counts each stage an application ever reached", () => {
    const steps = funnel([
      ["wishlist"],
      ["wishlist", "applied"],
      ["applied", "rejected"],
      ["applied", "interview", "rejected"],
      ["applied", "interview", "offer"],
      ["offer"],
    ]);
    expect(steps.map((s) => [s.stage, s.count])).toEqual([
      ["tracked", 6],
      ["applied", 5],
      ["interview", 3],
      ["offer", 2],
    ]);
    expect(steps.map((s) => formatPercent(s.rate))).toEqual(["", "83%", "60%", "67%"]);
  });

  it("reports 0% rather than NaN for empty stages", () => {
    expect(funnel([]).map((s) => s.rate)).toEqual([null, 0, 0, 0]);
  });
});
