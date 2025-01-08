import { describe, expect, it } from "vitest";

import { addDays, daysBetween, formatDate, startOfWeek, toISODate } from "./dates";

describe("date helpers", () => {
  it("adds days across month and year boundaries", () => {
    expect(addDays("2026-10-30", 3)).toBe("2026-11-02");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("counts whole days, ignoring DST", () => {
    expect(daysBetween("2026-10-13", "2026-10-23")).toBe(10);
    expect(daysBetween("2026-11-10", "2026-11-01")).toBe(-9);
    expect(daysBetween("2026-03-07", "2026-03-09")).toBe(2);
  });

  it("finds the Monday that starts the week", () => {
    expect(startOfWeek("2026-10-23")).toBe("2026-10-19"); // Friday
    expect(startOfWeek("2026-10-19")).toBe("2026-10-19"); // Monday
    expect(startOfWeek("2026-10-25")).toBe("2026-10-19"); // Sunday
  });

  it("formats and converts", () => {
    expect(toISODate(new Date("2026-10-23T23:59:00Z"))).toBe("2026-10-23");
    expect(formatDate("2026-10-23")).toBe("Oct 23, 2026");
    expect(formatDate(null)).toBe("");
  });
});
