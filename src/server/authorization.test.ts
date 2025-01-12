import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { applications, statusEvents, users, type Application } from "@/db/schema";
import type { Database } from "@/db/types";
import { createTestDb } from "@/test/db";
import { input, makeUser } from "@/test/fixtures";

import type { PublicUser } from "./auth";
import {
  createApplication,
  deleteApplication,
  getApplication,
  listApplications,
  moveApplication,
  setFollowUp,
  updateApplication,
} from "./applications";
import { exportApplicationsCsv } from "./export";
import { listReminders } from "./reminders";
import { getStats } from "./stats";

/*
 * The core security property: user A can never read or change user B's data,
 * whichever function they go through. Each test acts as Alice against an
 * application owned by Bob, then checks Bob's row is untouched.
 */

let db: Database;
let close: () => Promise<void>;
let alice: PublicUser;
let bob: PublicUser;
let bobsApp: Application;

const notFound = { code: "NOT_FOUND" };

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());
beforeEach(async () => {
  await db.delete(users);
  alice = await makeUser(db, "Alice");
  bob = await makeUser(db, "Bob");
  await createApplication(db, alice.id, input({ company: "Alice Co", status: "applied" }), new Date("2026-09-01"));
  bobsApp = await createApplication(
    db,
    bob.id,
    input({ company: "Bob Secret Corp", status: "applied", notes: "bob's private notes" }),
    new Date("2026-09-01"),
  );
});

async function bobsRowUnchanged() {
  const row = await getApplication(db, bob.id, bobsApp.id);
  expect(row).toMatchObject({ company: "Bob Secret Corp", status: "applied", notes: "bob's private notes", followUpOn: null });
  expect(row.events).toHaveLength(1);
}

describe("user A cannot read user B's data", () => {
  it("get by id answers not-found, the same as a missing id", async () => {
    await expect(getApplication(db, alice.id, bobsApp.id)).rejects.toMatchObject(notFound);
    await expect(getApplication(db, alice.id, crypto.randomUUID())).rejects.toMatchObject(notFound);
  });

  it("lists, searches and filters only return the caller's rows", async () => {
    expect((await listApplications(db, alice.id)).map((a) => a.company)).toEqual(["Alice Co"]);
    expect(await listApplications(db, alice.id, { q: "Secret" })).toEqual([]);
    expect((await listApplications(db, alice.id, { status: "applied" })).map((a) => a.userId)).toEqual([alice.id]);
  });

  it("CSV export contains only the caller's applications", async () => {
    const csv = await exportApplicationsCsv(db, alice.id);
    expect(csv).toContain("Alice Co");
    expect(csv).not.toContain("Bob Secret Corp");
    expect(csv).not.toContain("private notes");
  });

  it("stats and reminders only count the caller's applications", async () => {
    const stats = await getStats(db, alice.id, new Date("2026-09-03"));
    expect(stats.total).toBe(1);
    expect(stats.funnel[0].count).toBe(1);
    const reminders = await listReminders(db, alice.id, new Date("2026-10-23"));
    expect(reminders.map((r) => r.application.company)).toEqual(["Alice Co"]);
  });
});

describe("user A cannot change user B's data", () => {
  it("update", async () => {
    await expect(
      updateApplication(db, alice.id, bobsApp.id, input({ company: "Pwned", status: "applied" })),
    ).rejects.toMatchObject(notFound);
    await bobsRowUnchanged();
  });

  it("move", async () => {
    await expect(moveApplication(db, alice.id, bobsApp.id, "interview")).rejects.toMatchObject(notFound);
    await bobsRowUnchanged();
  });

  it("set follow-up", async () => {
    await expect(setFollowUp(db, alice.id, bobsApp.id, "2026-12-01")).rejects.toMatchObject(notFound);
    await bobsRowUnchanged();
  });

  it("delete", async () => {
    await expect(deleteApplication(db, alice.id, bobsApp.id)).rejects.toMatchObject(notFound);
    await bobsRowUnchanged();
  });

  it("leaves the whole table exactly as it was after every attempt", async () => {
    const before = await db.select().from(applications);
    const eventsBefore = await db.select().from(statusEvents);
    await Promise.allSettled([
      updateApplication(db, alice.id, bobsApp.id, input({ company: "x" })),
      moveApplication(db, alice.id, bobsApp.id, "rejected"),
      setFollowUp(db, alice.id, bobsApp.id, null),
      deleteApplication(db, alice.id, bobsApp.id),
    ]);
    expect(await db.select().from(applications)).toEqual(expect.arrayContaining(before));
    expect(await db.select().from(applications)).toHaveLength(before.length);
    expect(await db.select().from(statusEvents)).toHaveLength(eventsBefore.length);
  });

  it("creating always assigns the caller as owner", async () => {
    const created = await createApplication(db, alice.id, input({ company: "Mine" }));
    expect(created.userId).toBe(alice.id);
    expect((await listApplications(db, bob.id)).map((a) => a.company)).toEqual(["Bob Secret Corp"]);
  });
});
