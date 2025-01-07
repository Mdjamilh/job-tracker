import { createHash, randomBytes } from "node:crypto";

import bcrypt from "bcryptjs";
import { and, eq, gt, lte } from "drizzle-orm";

import { sessions, users, type User } from "@/db/schema";
import type { Database } from "@/db/types";

import { DomainError, isUniqueViolation } from "./errors";

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** Sessions with less than this left are extended on use (sliding expiry). */
const RENEW_WHEN_LEFT_MS = 15 * 24 * 60 * 60 * 1000;

function bcryptCost(): number {
  const cost = Number(process.env.BCRYPT_COST ?? 12);
  return Number.isInteger(cost) && cost >= 4 && cost <= 15 ? cost : 12;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, bcryptCost());
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Compared against when the email is unknown, so both paths cost one bcrypt check. */
let dummyHash: Promise<string> | undefined;

export type PublicUser = Pick<User, "id" | "email" | "name">;

function toPublic(user: User): PublicUser {
  return { id: user.id, email: user.email, name: user.name };
}

/** Expects already-validated input (see signUpSchema): email is lowercased. */
export async function registerUser(
  db: Database,
  input: { email: string; name: string; password: string },
): Promise<PublicUser> {
  const passwordHash = await hashPassword(input.password);
  try {
    const [user] = await db
      .insert(users)
      .values({ email: input.email, name: input.name, passwordHash })
      .returning();
    return toPublic(user);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new DomainError("EMAIL_TAKEN", "An account with that email already exists. Try logging in.");
    }
    throw error;
  }
}

/** Same error for "no such user" and "wrong password", so emails can't be enumerated here. */
export async function authenticate(db: Database, email: string, password: string): Promise<PublicUser> {
  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user) {
    dummyHash ??= hashPassword("not-a-real-password");
    await verifyPassword(password, await dummyHash);
    throw new DomainError("INVALID_CREDENTIALS", "Email or password is incorrect.");
  }
  if (!(await verifyPassword(password, user.passwordHash))) {
    throw new DomainError("INVALID_CREDENTIALS", "Email or password is incorrect.");
  }
  return toPublic(user);
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Returns the raw token for the cookie; only its hash is stored. */
export async function createSession(
  db: Database,
  userId: string,
  now = new Date(),
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  await db.insert(sessions).values({ tokenHash: hashToken(token), userId, expiresAt });
  return { token, expiresAt };
}

export type SessionLookup = { user: PublicUser; expiresAt: Date; renewed: boolean };

export async function validateSession(
  db: Database,
  token: string | undefined,
  now = new Date(),
): Promise<SessionLookup | null> {
  if (!token || token.length > 100) return null;
  const tokenHash = hashToken(token);
  const [row] = await db
    .select({ user: users, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now)))
    .limit(1);
  if (!row) return null;

  let expiresAt = row.expiresAt;
  let renewed = false;
  if (expiresAt.getTime() - now.getTime() < RENEW_WHEN_LEFT_MS) {
    expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
    await db.update(sessions).set({ expiresAt }).where(eq(sessions.tokenHash, tokenHash));
    renewed = true;
  }
  return { user: toPublic(row.user), expiresAt, renewed };
}

export async function revokeSession(db: Database, token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
}

export async function purgeExpiredSessions(db: Database, now = new Date()): Promise<void> {
  await db.delete(sessions).where(lte(sessions.expiresAt, now));
}
