import { addDays, startOfWeek } from "./dates";
import type { Status } from "./status";

export type WeekBucket = { weekStart: string; count: number };

/** Applications submitted per ISO week (Monday start), oldest first, zero-filled. */
export function weeklyCounts(
  appliedDates: readonly (string | null)[],
  today: string,
  weeks = 8,
): WeekBucket[] {
  const current = startOfWeek(today);
  const buckets: WeekBucket[] = [];
  for (let i = weeks - 1; i >= 0; i--) buckets.push({ weekStart: addDays(current, -7 * i), count: 0 });
  const index = new Map(buckets.map((b, i) => [b.weekStart, i]));
  for (const date of appliedDates) {
    if (!date) continue;
    const i = index.get(startOfWeek(date));
    if (i !== undefined) buckets[i].count += 1;
  }
  return buckets;
}

export type FunnelStep = {
  stage: "tracked" | "applied" | "interview" | "offer";
  label: string;
  count: number;
  rate: number | null;
};

/**
 * Funnel from each application's full history, not just its current status:
 * an application that reached interview and was later rejected still counts
 * as an interview. `rate` is the conversion from the previous step.
 */
export function funnel(histories: readonly (readonly Status[])[]): FunnelStep[] {
  const reached = (stages: Status[]) => histories.filter((h) => h.some((s) => stages.includes(s))).length;
  // Rejected only follows a submitted stage, so a rejected history was applied.
  const counts = {
    tracked: histories.length,
    applied: reached(["applied", "interview", "offer", "rejected"]),
    interview: reached(["interview", "offer"]),
    offer: reached(["offer"]),
  };
  const steps: Omit<FunnelStep, "rate">[] = [
    { stage: "tracked", label: "Tracked", count: counts.tracked },
    { stage: "applied", label: "Applied", count: counts.applied },
    { stage: "interview", label: "Interview", count: counts.interview },
    { stage: "offer", label: "Offer", count: counts.offer },
  ];
  return steps.map((step, i) => ({
    ...step,
    rate: i === 0 ? null : steps[i - 1].count === 0 ? 0 : step.count / steps[i - 1].count,
  }));
}

export function formatPercent(rate: number | null): string {
  return rate === null ? "" : `${Math.round(rate * 100)}%`;
}
