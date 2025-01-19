import Link from "next/link";

import { NavLinks } from "@/components/nav-links";
import { getDb } from "@/db";
import { listReminders } from "@/server/reminders";
import { requireUser } from "@/server/session";

import { logOutAction } from "../(auth)/actions";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const reminders = await listReminders(await getDb(), user.id);

  return (
    <>
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/board" className="text-lg font-semibold tracking-tight">
            <span className="text-accent">Job</span> Tracker
          </Link>
          <NavLinks reminderCount={reminders.length} />
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="hidden text-muted sm:inline" data-testid="current-user">
              {user.email}
            </span>
            <form action={logOutAction}>
              <button type="submit" className="btn-ghost">
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </>
  );
}
