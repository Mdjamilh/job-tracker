import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";

import { StatusBadge } from "@/components/status-badge";
import { getDb } from "@/db";
import { formatDate } from "@/lib/dates";
import { formatSalary } from "@/lib/format";
import { STATUSES, STATUS_LABELS } from "@/lib/status";
import { SORT_KEYS, listApplications, type ListFilters, type SortKey } from "@/server/applications";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Applications" };

// Bad query-string values fall back to defaults instead of erroring.
const filtersSchema = z.object({
  status: z.enum(STATUSES).optional().catch(undefined),
  q: z.string().max(100).optional().catch(undefined),
  sort: z.enum(SORT_KEYS).optional().catch(undefined),
  dir: z.enum(["asc", "desc"]).optional().catch(undefined),
});

const COLUMNS: { key: SortKey; label: string; className?: string }[] = [
  { key: "company", label: "Company" },
  { key: "role", label: "Role" },
  { key: "status", label: "Status" },
  { key: "appliedOn", label: "Applied" },
  { key: "salaryMax", label: "Salary", className: "hidden md:table-cell" },
  { key: "updatedAt", label: "Updated", className: "hidden lg:table-cell" },
];

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ApplicationsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const raw = await searchParams;
  const filters: ListFilters = filtersSchema.parse({
    status: raw.status || undefined,
    q: typeof raw.q === "string" ? raw.q : undefined,
    sort: raw.sort,
    dir: raw.dir,
  });
  const rows = await listApplications(await getDb(), user.id, filters);

  const sortHref = (key: SortKey) => {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.q) params.set("q", filters.q);
    params.set("sort", key);
    params.set("dir", filters.sort === key && (filters.dir ?? "asc") === "asc" ? "desc" : "asc");
    return `/applications?${params}`;
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Applications</h1>
          <p className="text-sm text-muted">
            {rows.length} {rows.length === 1 ? "application" : "applications"}
            {filters.status || filters.q ? " match your filters" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <a href="/export" className="btn-ghost" download>
            Export CSV
          </a>
          <Link href="/applications/new" className="btn-primary">
            Add application
          </Link>
        </div>
      </div>

      <form role="search" className="card mb-4 flex flex-wrap items-end gap-3 p-3" action="/applications">
        <div className="min-w-48 flex-1">
          <label htmlFor="q" className="label">
            Search
          </label>
          <input id="q" name="q" className="field" placeholder="Company or role" defaultValue={filters.q} />
        </div>
        <div>
          <label htmlFor="status-filter" className="label">
            Status
          </label>
          <select id="status-filter" name="status" className="field" defaultValue={filters.status ?? ""}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        {filters.sort && <input type="hidden" name="sort" value={filters.sort} />}
        {filters.dir && <input type="hidden" name="dir" value={filters.dir} />}
        <button type="submit" className="btn-primary">
          Filter
        </button>
        {(filters.q || filters.status) && (
          <Link href="/applications" className="btn-ghost">
            Clear
          </Link>
        )}
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-stone-50 text-xs text-muted uppercase">
            <tr>
              {COLUMNS.map((col) => {
                const active = filters.sort === col.key;
                const dir = active ? (filters.dir ?? "asc") : undefined;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    className={`px-3 py-2 font-medium ${col.className ?? ""}`}
                    aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : undefined}
                  >
                    <Link href={sortHref(col.key)} className="inline-flex items-center gap-1 hover:text-ink">
                      {col.label}
                      <span aria-hidden>{dir === "asc" ? "▲" : dir === "desc" ? "▼" : ""}</span>
                    </Link>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((app) => (
              <tr key={app.id} className="hover:bg-stone-50">
                <td className="px-3 py-2 font-medium">
                  <Link href={`/applications/${app.id}`} className="hover:underline">
                    {app.company}
                  </Link>
                </td>
                <td className="px-3 py-2">{app.role}</td>
                <td className="px-3 py-2">
                  <StatusBadge status={app.status} />
                </td>
                <td className="px-3 py-2 whitespace-nowrap">{formatDate(app.appliedOn)}</td>
                <td className="hidden px-3 py-2 whitespace-nowrap md:table-cell">
                  {formatSalary(app.salaryMin, app.salaryMax)}
                </td>
                <td className="hidden px-3 py-2 whitespace-nowrap text-muted lg:table-cell">
                  {formatDate(app.updatedAt.toISOString().slice(0, 10))}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="px-3 py-10 text-center text-muted">
                  No applications found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
