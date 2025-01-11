import type { Application } from "@/db/schema";
import type { Database } from "@/db/types";
import { toCsv, type CsvColumn } from "@/lib/csv";
import { STATUS_LABELS } from "@/lib/status";

import { listApplications } from "./applications";

const COLUMNS: CsvColumn<Application>[] = [
  { header: "Company", value: (a) => a.company },
  { header: "Role", value: (a) => a.role },
  { header: "Status", value: (a) => STATUS_LABELS[a.status] },
  { header: "Applied on", value: (a) => a.appliedOn },
  { header: "Follow up on", value: (a) => a.followUpOn },
  { header: "Salary min", value: (a) => a.salaryMin },
  { header: "Salary max", value: (a) => a.salaryMax },
  { header: "Link", value: (a) => a.link },
  { header: "Notes", value: (a) => a.notes },
  { header: "Last status change", value: (a) => a.statusChangedAt.toISOString() },
  { header: "Created", value: (a) => a.createdAt.toISOString() },
];

/** Only ever the caller's own applications, via the same scoped list query. */
export async function exportApplicationsCsv(db: Database, userId: string): Promise<string> {
  const rows = await listApplications(db, userId, { sort: "company" });
  return toCsv(rows, COLUMNS);
}
