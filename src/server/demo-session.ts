import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/*
 * Demo-mode sessions.
 *
 * Without DATABASE_URL every serverless instance has its own in-memory
 * database, so a session row written by one instance is unknown to the next
 * one and visitors would be logged out after a single click. In demo mode
 * the cookie is therefore a signed, self-contained token
 * ("d.<userId>.<expiresMs>.<hmac>") that any instance can verify with the
 * shared AUTH_SECRET. These tokens are refused when a real database is
 * configured, so the production model (hashed tokens in the database,
 * revocable on log-out) is unaffected.
 */

const PREFIX = "d.";

declare global {
  // On globalThis, not module scope: Next.js can load this module more than
  // once per process (page and Server Action bundles), and every copy must
  // agree on the key.
  var __demoSessionSecret: string | undefined;
}

function secret(): string {
  const configured = process.env.AUTH_SECRET;
  if (configured && configured.length >= 32) return configured;
  // Fine for one local process; on Vercel set AUTH_SECRET so instances agree.
  globalThis.__demoSessionSecret ??= randomBytes(32).toString("hex");
  return globalThis.__demoSessionSecret;
}

function sign(payload: string, key: string): string {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

export function isDemoToken(token: string): boolean {
  return token.startsWith(PREFIX);
}

export function signDemoToken(userId: string, expiresAt: Date, key = secret()): string {
  const payload = `${userId}.${expiresAt.getTime()}`;
  return `${PREFIX}${payload}.${sign(payload, key)}`;
}

/** Returns the user id when the signature is valid and the token hasn't expired. */
export function verifyDemoToken(token: string, now = new Date(), key = secret()): string | null {
  if (!isDemoToken(token) || token.length > 200) return null;
  const parts = token.slice(PREFIX.length).split(".");
  if (parts.length !== 3) return null;
  const [userId, expires, signature] = parts;
  const expected = Buffer.from(sign(`${userId}.${expires}`, key));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  if (!/^\d+$/.test(expires) || Number(expires) <= now.getTime()) return null;
  return userId;
}
