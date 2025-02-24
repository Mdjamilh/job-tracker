import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { eq } from "drizzle-orm";

import { getDb, isDemoMode } from "@/db";
import { users } from "@/db/schema";

import { SESSION_TTL_MS, createSession, revokeSession, validateSession, type PublicUser } from "./auth";
import { isDemoToken, signDemoToken, verifyDemoToken } from "./demo-session";

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
 *
 * Demo mode (no DATABASE_URL) uses signed stateless tokens instead; see
 * demo-session.ts for why.
 */
const secure = process.env.NODE_ENV === "production";
export const SESSION_COOKIE = secure ? "__Host-jt_session" : "jt_session";
const COOKIE_MAX_AGE = 400 * 24 * 60 * 60; // browsers cap cookie lifetimes at 400 days
const COOKIE_OPTIONS = { httpOnly: true, secure, sameSite: "lax", path: "/" } as const;

export const getCurrentUser = cache(async (): Promise<PublicUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  if (isDemoToken(token)) {
    // Signed demo tokens are only honoured when there is no real database.
    const userId = isDemoMode() ? verifyDemoToken(token) : null;
    if (!userId) return null;
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    return user ? { id: user.id, email: user.email, name: user.name } : null;
  }
  const session = await validateSession(db, token);
  return session?.user ?? null;
});

export async function requireUser(): Promise<PublicUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function startSession(userId: string): Promise<void> {
  const token = isDemoMode()
    ? signDemoToken(userId, new Date(Date.now() + SESSION_TTL_MS))
    : (await createSession(await getDb(), userId)).token;
  (await cookies()).set(SESSION_COOKIE, token, { ...COOKIE_OPTIONS, maxAge: COOKIE_MAX_AGE });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token && !isDemoToken(token)) await revokeSession(await getDb(), token);
  // Overwrite with the same attributes: browsers ignore a __Host- cookie
  // deletion that lacks Secure, which cookies().delete() doesn't send.
  store.set(SESSION_COOKIE, "", { ...COOKIE_OPTIONS, maxAge: 0 });
}
