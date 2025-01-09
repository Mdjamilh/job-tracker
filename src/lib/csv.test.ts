import { describe, expect, it } from "vitest";

import { csvCell, toCsv } from "./csv";

describe("csvCell", () => {
  it("leaves plain values alone", () => {
    expect(csvCell("Acme")).toBe("Acme");
    expect(csvCell(120000)).toBe("120000");
    expect(csvCell(null)).toBe("");
  });

  it("quotes commas, quotes and newlines", () => {
    expect(csvCell("Acme, Inc.")).toBe('"Acme, Inc."');
    expect(csvCell('the "best" job')).toBe('"the ""best"" job"');
    expect(csvCell("line one\nline two")).toBe('"line one\nline two"');
  });

  it("neutralizes spreadsheet formulas", () => {
    expect(csvCell('=HYPERLINK("http://evil","x")')).toBe(`"'=HYPERLINK(""http://evil"",""x"")"`);
    expect(csvCell("+1 call me")).toBe("'+1 call me");
    expect(csvCell("-2")).toBe("'-2");
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
    // Numbers are data, not user text: a negative number stays a number.
    expect(csvCell(-2)).toBe("-2");
  });
});

describe("toCsv", () => {
  it("writes a header row and CRLF-terminated lines", () => {
    const csv = toCsv(
      [
        { a: "x", b: 1 },
        { a: "y,z", b: null },
      ],
      [
        { header: "A", value: (r) => r.a },
        { header: "B", value: (r) => r.b },
      ],
    );
    expect(csv).toBe('A,B\r\nx,1\r\n"y,z",\r\n');
  });
});
