import { and, eq, ne } from "drizzle-orm";

import { applications, type Application } from "@/db/schema";
import type { Database } from "@/db/types";
import { daysBetween, toISODate } from "@/lib/dates";

/** "No response in 10 days": how long a submitted application can sit before a nudge. */
export const STALE_AFTER_DAYS = 10;

export type Reminder = {
  application: Application;
  kind: "follow-up" | "stale";
  /** Days past the follow-up date, or days since the last status change. */
  days: number;
  message: string;
};

/**
 * Pure rule, so it can be tested without a database:
 * - a follow-up date that has arrived always reminds (snoozing sets a new one);
 * - otherwise an applied/interview application with no status change for
 *   STALE_AFTER_DAYS is flagged, unless a future follow-up date is set.
 */
export function reminderFor(application: Application, today: string): Reminder | null {
  if (application.status === "rejected") return null;

  if (application.followUpOn) {
    const overdue = daysBetween(application.followUpOn, today);
    if (overdue < 0) return null;
    return {
      application,
      kind: "follow-up",
      days: overdue,
      message:
        overdue === 0
          ? "Follow-up due today"
          : `Follow-up was due ${overdue} day${overdue === 1 ? "" : "s"} ago`,
    };
  }

  if (application.status !== "applied" && application.status !== "interview") return null;
  const quiet = daysBetween(toISODate(application.statusChangedAt), today);
  if (quiet < STALE_AFTER_DAYS) return null;
  return {
    application,
    kind: "stale",
    days: quiet,
    message: `No response in ${quiet} days`,
  };
}

export async function listReminders(db: Database, userId: string, now = new Date()): Promise<Reminder[]> {
  const today = toISODate(now);
  const rows = await db
    .select()
    .from(applications)
    .where(and(eq(applications.userId, userId), ne(applications.status, "rejected")));
  return rows
    .map((row) => reminderFor(row, today))
    .filter((r): r is Reminder => r !== null)
    .sort((a, b) => b.days - a.days || a.application.company.localeCompare(b.application.company));
}
