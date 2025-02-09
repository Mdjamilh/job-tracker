import type { Metadata } from "next";
import Link from "next/link";

import { StatusBadge } from "@/components/status-badge";
import { getDb } from "@/db";
import { STALE_AFTER_DAYS, listReminders } from "@/server/reminders";
import { requireUser } from "@/server/session";

import { snoozeReminderAction } from "../actions";

export const metadata: Metadata = { title: "Reminders" };

export default async function RemindersPage() {
  const user = await requireUser();
  const reminders = await listReminders(await getDb(), user.id);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Reminders</h1>
      <p className="mb-4 text-sm text-muted">
        Applications with a follow-up date that has arrived, or no response in {STALE_AFTER_DAYS} days.
      </p>

      {reminders.length === 0 ? (
        <p className="card p-8 text-center text-muted">You&apos;re all caught up.</p>
      ) : (
        <ul className="space-y-3" data-testid="reminders">
          {reminders.map(({ application: app, message, kind }) => (
            <li key={app.id} className="card flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  <Link href={`/applications/${app.id}`} className="hover:underline">
                    {app.company}
                  </Link>{" "}
                  <span className="font-normal text-muted">{app.role}</span>
                </p>
                <p className={`text-sm ${kind === "follow-up" ? "text-interview" : "text-muted"}`}>
                  {message}
                </p>
              </div>
              <StatusBadge status={app.status} />
              <div className="flex gap-2">
                <form action={snoozeReminderAction}>
                  <input type="hidden" name="id" value={app.id} />
                  <input type="hidden" name="days" value="3" />
                  <button type="submit" className="btn-ghost">
                    Snooze 3 days
                  </button>
                </form>
                <form action={snoozeReminderAction}>
                  <input type="hidden" name="id" value={app.id} />
                  <input type="hidden" name="days" value={STALE_AFTER_DAYS} />
                  <button
                    type="submit"
                    className="btn-primary"
                    aria-label={`Mark ${app.company} as followed up`}
                  >
                    I followed up
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
