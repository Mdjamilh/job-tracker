import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { getDb } from "@/db";

import { createSession, revokeSession, validateSession, type PublicUser } from "./auth";

/*
 * Cookie hardening:
 * - HttpOnly: page scripts (and any XSS) can't read the token.
 * - Secure + the __Host- prefix in production: HTTPS only, this exact host,
 *   path "/", and no Domain attribute, so subdomains can't plant or read it.
 * - SameSite=Lax: not sent on cross-site POSTs. Server Actions additionally
 *   check the Origin header against the host, which is Next.js's CSRF defence.
 *
 * The database row is the source of truth for expiry (30 days, sliding), so
 * the cookie itself may outlive the session; a stale cookie simply fails lookup.
 */
const secure = process.env.NODE_ENV === "production";
export const SESSION_COOKIE = secure ? "__Host-jt_session" : "jt_session";
const COOKIE_MAX_AGE = 400 * 24 * 60 * 60; // browsers cap cookie lifetimes at 400 days

export const getCurrentUser = cache(async (): Promise<PublicUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await validateSession(await getDb(), token);
  return session?.user ?? null;
});

export async function requireUser(): Promise<PublicUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function startSession(userId: string): Promise<void> {
  const { token } = await createSession(await getDb(), userId);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await revokeSession(await getDb(), token);
  store.delete(SESSION_COOKIE);
}
