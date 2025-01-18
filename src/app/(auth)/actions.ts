"use server";

import { redirect } from "next/navigation";

import { getDb } from "@/db";
import { fieldErrors, logInSchema, signUpSchema } from "@/lib/validation";
import { authenticate, registerUser } from "@/server/auth";
import { DomainError } from "@/server/errors";
import { loginLimiter } from "@/server/rate-limit";
import { endSession, startSession } from "@/server/session";

export type AuthFormState = {
  error?: string;
  fields?: Record<string, string>;
  values?: { name?: string; email?: string };
};

export async function signUpAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const raw = Object.fromEntries(formData);
  const values = { name: String(raw.name ?? ""), email: String(raw.email ?? "") };
  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values };

  try {
    const user = await registerUser(await getDb(), parsed.data);
    await startSession(user.id);
  } catch (error) {
    if (error instanceof DomainError) return { error: error.message, values };
    throw error;
  }
  redirect("/board");
}

export async function logInAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const raw = Object.fromEntries(formData);
  const values = { email: String(raw.email ?? "") };
  const parsed = logInSchema.safeParse(raw);
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values };

  const key = parsed.data.email;
  const limit = loginLimiter.attempt(key);
  if (!limit.ok) {
    const minutes = Math.ceil(limit.retryAfterMs / 60_000);
    return { error: `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`, values };
  }

  try {
    const user = await authenticate(await getDb(), parsed.data.email, parsed.data.password);
    loginLimiter.reset(key);
    await startSession(user.id);
  } catch (error) {
    if (error instanceof DomainError) return { error: error.message, values };
    throw error;
  }
  redirect("/board");
}

export async function logOutAction(): Promise<void> {
  await endSession();
  redirect("/login");
}
