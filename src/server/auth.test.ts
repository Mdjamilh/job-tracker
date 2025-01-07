import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { sessions, users } from "@/db/schema";
import type { Database } from "@/db/types";
import { createTestDb } from "@/test/db";

import {
  SESSION_TTL_MS,
  authenticate,
  createSession,
  hashToken,
  purgeExpiredSessions,
  registerUser,
  revokeSession,
  validateSession,
} from "./auth";

let db: Database;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());
beforeEach(async () => {
  await db.delete(users);
});

const sam = { email: "sam@example.com", name: "Sam", password: "correct horse battery" };

describe("passwords", () => {
  it("stores a bcrypt hash, never the password", async () => {
    await registerUser(db, sam);
    const row = await db.query.users.findFirst({ where: eq(users.email, sam.email) });
    expect(row?.passwordHash).toMatch(/^\$2[aby]\$\d{2}\$/);
    expect(row?.passwordHash).not.toContain(sam.password);
  });

  it("refuses a second account with the same email", async () => {
    await registerUser(db, sam);
    await expect(registerUser(db, { ...sam, name: "Other" })).rejects.toMatchObject({ code: "EMAIL_TAKEN" });
  });

  it("authenticates with the right password only", async () => {
    const user = await registerUser(db, sam);
    await expect(authenticate(db, sam.email, sam.password)).resolves.toEqual(user);
    await expect(authenticate(db, sam.email, "wrong password!")).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
    });
  });

  it("gives the same error for an unknown email as for a wrong password", async () => {
    await registerUser(db, sam);
    const unknown = await authenticate(db, "nobody@example.com", "whatever").catch((e: Error) => e.message);
    const wrong = await authenticate(db, sam.email, "whatever").catch((e: Error) => e.message);
    expect(unknown).toBe(wrong);
  });

  it("never returns the hash to callers", async () => {
    const user = await registerUser(db, sam);
    expect(Object.keys(user).sort()).toEqual(["email", "id", "name"]);
  });
});

describe("sessions", () => {
  it("stores only the SHA-256 hash of the cookie token", async () => {
    const user = await registerUser(db, sam);
    const { token } = await createSession(db, user.id);
    const rows = await db.select().from(sessions);
    expect(rows).toHaveLength(1);
    expect(rows[0].tokenHash).toBe(hashToken(token));
    expect(rows[0].tokenHash).not.toBe(token);
    expect(token.length).toBeGreaterThanOrEqual(43); // 32 random bytes, base64url
  });

  it("resolves a valid token to its user and rejects garbage", async () => {
    const user = await registerUser(db, sam);
    const { token } = await createSession(db, user.id);
    expect((await validateSession(db, token))?.user).toEqual(user);
    expect(await validateSession(db, undefined)).toBeNull();
    expect(await validateSession(db, "made-up-token")).toBeNull();
    expect(await validateSession(db, hashToken(token))).toBeNull(); // a leaked hash is not a credential
  });

  it("expires sessions and slides the expiry when half used", async () => {
    const user = await registerUser(db, sam);
    const start = new Date("2026-10-01T00:00:00Z");
    const { token } = await createSession(db, user.id, start);

    const early = await validateSession(db, token, new Date(start.getTime() + 60_000));
    expect(early?.renewed).toBe(false);

    const later = new Date(start.getTime() + 20 * 24 * 3600_000);
    const renewed = await validateSession(db, token, later);
    expect(renewed?.renewed).toBe(true);
    expect(renewed?.expiresAt.getTime()).toBe(later.getTime() + SESSION_TTL_MS);

    const afterExpiry = new Date(later.getTime() + SESSION_TTL_MS + 1);
    expect(await validateSession(db, token, afterExpiry)).toBeNull();
    await purgeExpiredSessions(db, afterExpiry);
    expect(await db.select().from(sessions)).toHaveLength(0);
  });

  it("revokes a session on log-out", async () => {
    const user = await registerUser(db, sam);
    const { token } = await createSession(db, user.id);
    await revokeSession(db, token);
    expect(await validateSession(db, token)).toBeNull();
  });
});
