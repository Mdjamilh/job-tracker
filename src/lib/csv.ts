export type CsvColumn<T> = { header: string; value: (row: T) => string | number | null | undefined };

/**
 * Cells starting with these characters are treated as formulas by Excel,
 * Sheets and LibreOffice. A company named `=HYPERLINK(...)` must not run
 * when the user opens their export, so such cells get a leading apostrophe
 * (OWASP's recommended neutralization).
 */
const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (typeof value === "string" && FORMULA_START.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** RFC 4180 CSV with CRLF line endings. */
export function toCsv<T>(rows: readonly T[], columns: readonly CsvColumn<T>[]): string {
  const lines = [columns.map((c) => csvCell(c.header)).join(",")];
  for (const row of rows) lines.push(columns.map((c) => csvCell(c.value(row))).join(","));
  return lines.join("\r\n") + "\r\n";
}
