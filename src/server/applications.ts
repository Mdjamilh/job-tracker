import { and, asc, desc, eq, ilike, or, type SQL } from "drizzle-orm";

import { applications, statusEvents, type Application, type StatusEvent } from "@/db/schema";
import type { Database, Executor } from "@/db/types";
import { toISODate } from "@/lib/dates";
import { STATUS_LABELS, transitionError, type Status } from "@/lib/status";
import type { ApplicationInput } from "@/lib/validation";

import { DomainError, notFound } from "./errors";

/*
 * Every function here takes the acting user's id and puts it in the WHERE
 * clause of every read and write. There is deliberately no "get by id"
 * without a user id, so a forgotten ownership check can't compile.
 */

export const SORT_KEYS = ["company", "role", "status", "appliedOn", "updatedAt", "salaryMax"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export type ListFilters = {
  status?: Status;
  q?: string;
  sort?: SortKey;
  dir?: "asc" | "desc";
};

const SORT_COLUMNS = {
  company: applications.company,
  role: applications.role,
  status: applications.status,
  appliedOn: applications.appliedOn,
  updatedAt: applications.updatedAt,
  salaryMax: applications.salaryMax,
} as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Escapes LIKE wildcards so a search for "50%" means the literal text. */
function likePattern(q: string): string {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

function ownedBy(userId: string, id: string): SQL {
  return and(eq(applications.id, id), eq(applications.userId, userId))!;
}

export async function listApplications(
  db: Database,
  userId: string,
  filters: ListFilters = {},
): Promise<Application[]> {
  const conditions: SQL[] = [eq(applications.userId, userId)];
  if (filters.status) conditions.push(eq(applications.status, filters.status));
  const q = filters.q?.trim();
  if (q) {
    const pattern = likePattern(q);
    conditions.push(or(ilike(applications.company, pattern), ilike(applications.role, pattern))!);
  }
  const column = SORT_COLUMNS[filters.sort ?? "updatedAt"];
  const direction = (filters.dir ?? (filters.sort ? "asc" : "desc")) === "asc" ? asc : desc;
  return db
    .select()
    .from(applications)
    .where(and(...conditions))
    .orderBy(direction(column), asc(applications.id));
}

async function findOwned(db: Executor, userId: string, id: string): Promise<Application> {
  if (!UUID.test(id)) throw notFound();
  const [row] = await db.select().from(applications).where(ownedBy(userId, id)).limit(1);
  if (!row) throw notFound();
  return row;
}

export async function getApplication(
  db: Database,
  userId: string,
  id: string,
): Promise<Application & { events: StatusEvent[] }> {
  const application = await findOwned(db, userId, id);
  const events = await db
    .select()
    .from(statusEvents)
    .where(and(eq(statusEvents.applicationId, id), eq(statusEvents.userId, userId)))
    .orderBy(asc(statusEvents.changedAt), asc(statusEvents.id));
  return { ...application, events };
}

/** Entering a submitted stage without an applied date stamps today's date. */
function appliedOnFor(status: Status, appliedOn: string | null, now: Date): string | null {
  return appliedOn ?? (status === "wishlist" ? null : toISODate(now));
}

export async function createApplication(
  db: Database,
  userId: string,
  input: ApplicationInput,
  now = new Date(),
): Promise<Application> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(applications)
      .values({
        ...input,
        userId,
        appliedOn: appliedOnFor(input.status, input.appliedOn, now),
        statusChangedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    await tx
      .insert(statusEvents)
      .values({ applicationId: row.id, userId, fromStatus: null, toStatus: row.status, changedAt: now });
    return row;
  });
}

async function applyMove(tx: Executor, userId: string, current: Application, to: Status, now: Date) {
  const error = transitionError(current.status, to);
  if (error) throw new DomainError("INVALID_TRANSITION", error);
  await tx
    .insert(statusEvents)
    .values({ applicationId: current.id, userId, fromStatus: current.status, toStatus: to, changedAt: now });
  return {
    status: to,
    statusChangedAt: now,
    appliedOn: appliedOnFor(to, current.appliedOn, now),
  };
}

/** Moves to another stage, enforcing the transition rules and logging the change. */
export async function moveApplication(
  db: Database,
  userId: string,
  id: string,
  to: Status,
  now = new Date(),
): Promise<Application> {
  return db.transaction(async (tx) => {
    const current = await findOwned(tx, userId, id);
    const changes = await applyMove(tx, userId, current, to, now);
    const [row] = await tx
      .update(applications)
      .set({ ...changes, updatedAt: now })
      .where(ownedBy(userId, id))
      .returning();
    return row;
  });
}

/** Saves the edit form. A changed status goes through the same rules as a move. */
export async function updateApplication(
  db: Database,
  userId: string,
  id: string,
  input: ApplicationInput,
  now = new Date(),
): Promise<Application> {
  return db.transaction(async (tx) => {
    const current = await findOwned(tx, userId, id);
    const { status, ...fields } = input;
    const moved = status === current.status ? null : await applyMove(tx, userId, current, status, now);
    const [row] = await tx
      .update(applications)
      .set({
        ...fields,
        ...moved,
        appliedOn: fields.appliedOn ?? moved?.appliedOn ?? null,
        updatedAt: now,
      })
      .where(ownedBy(userId, id))
      .returning();
    return row;
  });
}

export async function deleteApplication(db: Database, userId: string, id: string): Promise<void> {
  if (!UUID.test(id)) throw notFound();
  const deleted = await db.delete(applications).where(ownedBy(userId, id)).returning({ id: applications.id });
  if (deleted.length === 0) throw notFound();
}

/** Sets or clears the follow-up date (used by the reminders page). */
export async function setFollowUp(
  db: Database,
  userId: string,
  id: string,
  followUpOn: string | null,
  now = new Date(),
): Promise<Application> {
  if (!UUID.test(id)) throw notFound();
  const [row] = await db
    .update(applications)
    .set({ followUpOn, updatedAt: now })
    .where(ownedBy(userId, id))
    .returning();
  if (!row) throw notFound();
  return row;
}

export function describeEvent(event: Pick<StatusEvent, "fromStatus" | "toStatus">): string {
  return event.fromStatus === null
    ? `Added as ${STATUS_LABELS[event.toStatus]}`
    : `${STATUS_LABELS[event.fromStatus]} to ${STATUS_LABELS[event.toStatus]}`;
}
