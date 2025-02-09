import type { Metadata } from "next";

import { FunnelChart, WeeklyChart } from "@/components/charts";
import { StatusBadge } from "@/components/status-badge";
import { getDb } from "@/db";
import { STATUSES } from "@/lib/status";
import { getStats } from "@/server/stats";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Stats" };

export default async function StatsPage() {
  const user = await requireUser();
  const stats = await getStats(await getDb(), user.id);
  const submitted = stats.weekly.reduce((sum, w) => sum + w.count, 0);

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Stats</h1>
      <p className="mb-4 text-sm text-muted">
        {stats.total} tracked, {submitted} submitted in the last {stats.weekly.length} weeks.
      </p>

      <div className="mb-6 flex flex-wrap gap-2" aria-label="Current status counts">
        {STATUSES.map((s) => (
          <span key={s} className="card flex items-center gap-2 px-3 py-1.5 text-sm">
            <StatusBadge status={s} />
            <span className="font-semibold">{stats.byStatus[s]}</span>
          </span>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <section className="card p-5" aria-labelledby="weekly-heading">
          <h2 id="weekly-heading" className="mb-3 font-semibold">
            Applications per week
          </h2>
          <WeeklyChart weeks={stats.weekly} />
        </section>
        <section className="card p-5" aria-labelledby="funnel-heading">
          <h2 id="funnel-heading" className="font-semibold">
            Funnel
          </h2>
          <p className="mb-4 text-xs text-muted">
            Counts every stage an application reached, so a rejection after an interview still counts as an
            interview.
          </p>
          <FunnelChart steps={stats.funnel} />
        </section>
      </div>
    </>
  );
}
