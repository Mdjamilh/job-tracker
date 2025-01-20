"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDb } from "@/db";
import { addDays, toISODate } from "@/lib/dates";
import { STATUSES } from "@/lib/status";
import { applicationInputSchema, fieldErrors } from "@/lib/validation";
import {
  createApplication,
  deleteApplication,
  moveApplication,
  setFollowUp,
  updateApplication,
} from "@/server/applications";
import { DomainError } from "@/server/errors";
import { STALE_AFTER_DAYS } from "@/server/reminders";
import { requireUser } from "@/server/session";

/*
 * Server Actions are public HTTP endpoints, so each one re-checks the
 * session and validates every argument; the user id always comes from the
 * session, never from the client.
 */

export type FormState = { error?: string; fields?: Record<string, string>; values?: Record<string, string> };
export type ActionResult = { ok: true } | { ok: false; error: string };

const idSchema = z.uuid();

function refresh() {
  for (const path of ["/board", "/applications", "/reminders", "/stats"]) revalidatePath(path);
}

function formValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData)
    if (typeof value === "string" && !key.startsWith("$")) values[key] = value;
  return values;
}

export async function createApplicationAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = formValues(formData);
  const parsed = applicationInputSchema.safeParse(values);
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values };

  const created = await createApplication(await getDb(), user.id, parsed.data);
  refresh();
  redirect(`/applications/${created.id}`);
}

export async function updateApplicationAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const values = formValues(formData);
  const parsedId = idSchema.safeParse(id);
  const parsed = applicationInputSchema.safeParse(values);
  if (!parsedId.success) return { error: "Application not found.", values };
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values };

  try {
    await updateApplication(await getDb(), user.id, parsedId.data, parsed.data);
  } catch (error) {
    if (error instanceof DomainError) return { error: error.message, values };
    throw error;
  }
  refresh();
  revalidatePath(`/applications/${id}`);
  redirect(`/applications/${id}`);
}

const moveSchema = z.object({ id: z.uuid(), to: z.enum(STATUSES) });

/** Used by the board (drag and drop or the keyboard "Move to" menu). */
export async function moveApplicationAction(id: string, to: string): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = moveSchema.safeParse({ id, to });
  if (!parsed.success) return { ok: false, error: "Invalid move." };
  try {
    await moveApplication(await getDb(), user.id, parsed.data.id, parsed.data.to);
  } catch (error) {
    if (error instanceof DomainError) return { ok: false, error: error.message };
    throw error;
  }
  refresh();
  revalidatePath(`/applications/${id}`);
  return { ok: true };
}

export async function deleteApplicationAction(id: string): Promise<void> {
  const user = await requireUser();
  const parsed = idSchema.safeParse(id);
  if (parsed.success) {
    try {
      await deleteApplication(await getDb(), user.id, parsed.data);
    } catch (error) {
      if (!(error instanceof DomainError)) throw error;
    }
  }
  refresh();
  redirect("/applications");
}

const followUpSchema = z.object({ id: z.uuid(), days: z.coerce.number().int().min(1).max(90) });

/** "Snooze" and "I followed up" both push the next reminder out by some days. */
export async function snoozeReminderAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = followUpSchema.safeParse({
    id: formData.get("id"),
    days: formData.get("days") ?? STALE_AFTER_DAYS,
  });
  if (!parsed.success) return;
  const followUpOn = addDays(toISODate(new Date()), parsed.data.days);
  try {
    await setFollowUp(await getDb(), user.id, parsed.data.id, followUpOn);
  } catch (error) {
    if (!(error instanceof DomainError)) throw error;
  }
  refresh();
}
