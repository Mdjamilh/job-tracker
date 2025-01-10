import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { users, type Application } from "@/db/schema";
import type { Database } from "@/db/types";
import { createTestDb } from "@/test/db";
import { input, makeUser } from "@/test/fixtures";

import { createApplication, moveApplication, setFollowUp } from "./applications";
import { listReminders, reminderFor } from "./reminders";

const app = (overrides: Partial<Application>): Application => ({
  id: "00000000-0000-4000-8000-000000000000",
  userId: "u",
  company: "Acme",
  role: "Engineer",
  link: null,
  status: "applied",
  salaryMin: null,
  salaryMax: null,
  notes: "",
  appliedOn: "2026-10-01",
  followUpOn: null,
  statusChangedAt: new Date("2026-10-01T09:00:00Z"),
  createdAt: new Date("2026-10-01T09:00:00Z"),
  updatedAt: new Date("2026-10-01T09:00:00Z"),
  ...overrides,
});

describe("reminderFor", () => {
  it("flags an application with no response after 10 days", () => {
    expect(reminderFor(app({}), "2026-10-10")).toBeNull();
    expect(reminderFor(app({}), "2026-10-11")).toMatchObject({ kind: "stale", days: 10, message: "No response in 10 days" });
  });

  it("also nudges stalled interviews, but not wishlist items or offers", () => {
    expect(reminderFor(app({ status: "interview" }), "2026-10-20")?.kind).toBe("stale");
    expect(reminderFor(app({ status: "wishlist" }), "2026-10-20")).toBeNull();
    expect(reminderFor(app({ status: "offer" }), "2026-10-20")).toBeNull();
  });

  it("uses an explicit follow-up date over the 10-day rule", () => {
    const snoozed = app({ followUpOn: "2026-10-25" });
    expect(reminderFor(snoozed, "2026-10-20")).toBeNull();
    expect(reminderFor(snoozed, "2026-10-25")).toMatchObject({ kind: "follow-up", message: "Follow-up due today" });
    expect(reminderFor(snoozed, "2026-10-26")?.message).toBe("Follow-up was due 1 day ago");
    // A wishlist item can carry an "apply by" follow-up too.
    expect(reminderFor(app({ status: "wishlist", followUpOn: "2026-10-01" }), "2026-10-03")?.days).toBe(2);
  });

  it("never reminds about rejected applications", () => {
    expect(reminderFor(app({ status: "rejected", followUpOn: "2026-10-01" }), "2026-11-01")).toBeNull();
  });
});

describe("listReminders", () => {
  let db: Database;
  let close: () => Promise<void>;

  beforeAll(async () => {
    ({ db, close } = await createTestDb());
  });
  afterAll(() => close());
  beforeEach(async () => {
    await db.delete(users);
  });

  it("lists the most overdue first and resets after a status change", async () => {
    const me = await makeUser(db);
    const older = await createApplication(db, me.id, input({ company: "Older", status: "applied" }), new Date("2026-10-01"));
    await createApplication(db, me.id, input({ company: "Newer", status: "applied" }), new Date("2026-10-05"));
    await createApplication(db, me.id, input({ company: "Fresh", status: "applied" }), new Date("2026-10-20"));

    const now = new Date("2026-10-23T12:00:00Z");
    expect((await listReminders(db, me.id, now)).map((r) => [r.application.company, r.days])).toEqual([
      ["Older", 22],
      ["Newer", 18],
    ]);

    await moveApplication(db, me.id, older.id, "interview", new Date("2026-10-22"));
    expect((await listReminders(db, me.id, now)).map((r) => r.application.company)).toEqual(["Newer"]);
  });

  it("is silenced by snoozing to a future follow-up date", async () => {
    const me = await makeUser(db);
    const a = await createApplication(db, me.id, input({ status: "applied" }), new Date("2026-10-01"));
    const now = new Date("2026-10-23T12:00:00Z");
    expect(await listReminders(db, me.id, now)).toHaveLength(1);
    await setFollowUp(db, me.id, a.id, "2026-10-26");
    expect(await listReminders(db, me.id, now)).toHaveLength(0);
  });
});
