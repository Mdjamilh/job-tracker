import { asc, eq } from "drizzle-orm";

import { applications, statusEvents } from "@/db/schema";
import type { Database } from "@/db/types";
import { toISODate } from "@/lib/dates";
import { funnel, weeklyCounts, type FunnelStep, type WeekBucket } from "@/lib/stats";
import type { Status } from "@/lib/status";

export type Stats = {
  weekly: WeekBucket[];
  funnel: FunnelStep[];
  byStatus: Record<Status, number>;
  total: number;
};

export async function getStats(db: Database, userId: string, now = new Date(), weeks = 8): Promise<Stats> {
  const [apps, events] = await Promise.all([
    db
      .select({ id: applications.id, status: applications.status, appliedOn: applications.appliedOn })
      .from(applications)
      .where(eq(applications.userId, userId)),
    db
      .select({ applicationId: statusEvents.applicationId, toStatus: statusEvents.toStatus })
      .from(statusEvents)
      .where(eq(statusEvents.userId, userId))
      .orderBy(asc(statusEvents.changedAt)),
  ]);

  const history = new Map<string, Status[]>(apps.map((a) => [a.id, []]));
  for (const e of events) history.get(e.applicationId)?.push(e.toStatus);

  const byStatus: Record<Status, number> = { wishlist: 0, applied: 0, interview: 0, offer: 0, rejected: 0 };
  for (const a of apps) byStatus[a.status] += 1;

  return {
    weekly: weeklyCounts(
      apps.map((a) => a.appliedOn),
      toISODate(now),
      weeks,
    ),
    funnel: funnel([...history.values()]),
    byStatus,
    total: apps.length,
  };
}
