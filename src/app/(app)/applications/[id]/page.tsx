import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteButton } from "@/components/delete-button";
import { StatusBadge } from "@/components/status-badge";
import { Timeline } from "@/components/timeline";
import { getDb } from "@/db";
import { formatDate } from "@/lib/dates";
import { formatSalary, linkHost } from "@/lib/format";
import { getApplication } from "@/server/applications";
import { DomainError } from "@/server/errors";
import { requireUser } from "@/server/session";

type Props = { params: Promise<{ id: string }> };

async function load(id: string) {
  const user = await requireUser();
  try {
    return await getApplication(await getDb(), user.id, id);
  } catch (error) {
    if (error instanceof DomainError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const app = await load((await params).id);
  return { title: `${app.company}: ${app.role}` };
}

export default async function ApplicationPage({ params }: Props) {
  const app = await load((await params).id);
  const salary = formatSalary(app.salaryMin, app.salaryMax);

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_20rem]">
      <article className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{app.company}</h1>
            <p className="text-muted">{app.role}</p>
          </div>
          <StatusBadge status={app.status} />
        </div>

        <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <Detail label="Applied on">{formatDate(app.appliedOn) || "Not yet"}</Detail>
          <Detail label="Follow up on">{formatDate(app.followUpOn) || "No date set"}</Detail>
          <Detail label="Salary">{salary || "Not listed"}</Detail>
          <Detail label="Posting">
            {app.link ? (
              <a
                href={app.link}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-accent underline"
              >
                {linkHost(app.link)}
              </a>
            ) : (
              "No link"
            )}
          </Detail>
        </dl>

        <h2 className="mt-6 text-sm font-semibold">Notes</h2>
        <p className="mt-1 text-sm whitespace-pre-wrap text-ink/90">{app.notes || "No notes yet."}</p>

        <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-4">
          <Link href={`/applications/${app.id}/edit`} className="btn-primary">
            Edit
          </Link>
          <Link href="/board" className="btn-ghost">
            Back to board
          </Link>
          <DeleteButton id={app.id} company={app.company} />
        </div>
      </article>

      <aside className="card p-5">
        <h2 className="mb-3 text-sm font-semibold">Timeline</h2>
        <Timeline events={app.events} />
      </aside>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}
