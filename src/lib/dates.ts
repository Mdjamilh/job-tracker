/**
 * Calendar-date helpers on plain "YYYY-MM-DD" strings (what Postgres `date`
 * columns return). Everything is UTC so results don't depend on the server's
 * timezone.
 */
const DAY_MS = 24 * 60 * 60 * 1000;

export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parse(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`);
}

export function addDays(iso: string, days: number): string {
  return toISODate(new Date(parse(iso) + days * DAY_MS));
}

/** Whole days from `a` to `b` (positive when b is later). */
export function daysBetween(a: string, b: string): number {
  return Math.round((parse(b) - parse(a)) / DAY_MS);
}

/** Monday of the ISO week containing `iso`. */
export function startOfWeek(iso: string): string {
  const day = new Date(parse(iso)).getUTCDay(); // 0 = Sunday
  return addDays(iso, -((day + 6) % 7));
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(parse(iso)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
