import { describe, expect, it } from "vitest";

import { formatSalary, linkHost } from "./format";

describe("formatSalary", () => {
  it("formats ranges, single bounds and empty values", () => {
    expect(formatSalary(90000, 120000)).toBe("$90,000 - $120,000");
    expect(formatSalary(100000, 100000)).toBe("$100,000");
    expect(formatSalary(80000, null)).toBe("from $80,000");
    expect(formatSalary(null, 95000)).toBe("up to $95,000");
    expect(formatSalary(null, null)).toBe("");
  });
});

describe("linkHost", () => {
  it("shows a short host for links", () => {
    expect(linkHost("https://www.example.com/jobs/1?ref=x")).toBe("example.com");
    expect(linkHost("garbage")).toBe("garbage");
  });
});
