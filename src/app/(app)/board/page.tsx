import type { Metadata } from "next";
import Link from "next/link";

import { Board } from "@/components/board";
import { getDb } from "@/db";
import { listApplications } from "@/server/applications";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Board" };

export default async function BoardPage() {
  const user = await requireUser();
  const applications = await listApplications(await getDb(), user.id);
  const cards = applications.map(({ id, company, role, status, salaryMin, salaryMax, appliedOn }) => ({
    id,
    company,
    role,
    status,
    salaryMin,
    salaryMax,
    appliedOn,
  }));

  return (
    <>
      <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Board</h1>
          <p className="text-sm text-muted">
            Drag a card to another column, or use its &quot;Move to&quot; menu.
          </p>
        </div>
        <Link href="/applications/new" className="btn-primary">
          Add application
        </Link>
      </div>
      <Board applications={cards} />
    </>
  );
}
