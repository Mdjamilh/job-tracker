import { getDb } from "@/db";
import { toISODate } from "@/lib/dates";
import { exportApplicationsCsv } from "@/server/export";
import { getCurrentUser } from "@/server/session";

const BOM = String.fromCharCode(0xfeff);

export const dynamic = "force-dynamic";

/** GET /export: the signed-in user's applications as a CSV download. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Not signed in", { status: 401 });

  const csv = await exportApplicationsCsv(await getDb(), user.id);
  // A UTF-8 byte-order mark makes Excel read accented company names correctly.
  return new Response(BOM + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="job-applications-${toISODate(new Date())}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
