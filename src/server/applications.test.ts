import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { users } from "@/db/schema";
import type { Database } from "@/db/types";
import { createTestDb } from "@/test/db";
import { input, makeUser } from "@/test/fixtures";

import type { PublicUser } from "./auth";
import {
  createApplication,
  deleteApplication,
  describeEvent,
  getApplication,
  listApplications,
  moveApplication,
  updateApplication,
} from "./applications";

let db: Database;
let close: () => Promise<void>;
let me: PublicUser;

const day = (n: number) => new Date(Date.UTC(2026, 9, n, 12));

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());
beforeEach(async () => {
  await db.delete(users);
  me = await makeUser(db, "Me");
});

describe("creating applications", () => {
  it("stores the fields and records the first timeline event", async () => {
    const app = await createApplication(
      db,
      me.id,
      input({
        company: "Globex",
        salaryMin: "100000",
        salaryMax: "130000",
        link: "https://globex.example/jobs/7",
      }),
      day(1),
    );
    const full = await getApplication(db, me.id, app.id);
    expect(full).toMatchObject({ company: "Globex", status: "wishlist", salaryMin: 100000, appliedOn: null });
    expect(full.events.map(describeEvent)).toEqual(["Added as Wishlist"]);
  });

  it("stamps the applied date when created past the wishlist", async () => {
    const app = await createApplication(db, me.id, input({ status: "applied" }), day(5));
    expect(app.appliedOn).toBe("2026-10-05");
    const kept = await createApplication(
      db,
      me.id,
      input({ status: "applied", appliedOn: "2026-09-30" }),
      day(5),
    );
    expect(kept.appliedOn).toBe("2026-09-30");
  });

  it("enforces the salary range in the database too", async () => {
    await expect(
      createApplication(db, me.id, { ...input(), salaryMin: 200000, salaryMax: 100000 }),
    ).rejects.toThrow();
  });
});

describe("moving between stages", () => {
  it("records each change in order on the timeline", async () => {
    const app = await createApplication(db, me.id, input(), day(1));
    await moveApplication(db, me.id, app.id, "applied", day(2));
    await moveApplication(db, me.id, app.id, "interview", day(9));
    const moved = await moveApplication(db, me.id, app.id, "offer", day(20));

    expect(moved).toMatchObject({ status: "offer", appliedOn: "2026-10-02" });
    expect(moved.statusChangedAt).toEqual(day(20));
    const { events } = await getApplication(db, me.id, app.id);
    expect(events.map(describeEvent)).toEqual([
      "Added as Wishlist",
      "Wishlist to Applied",
      "Applied to Interview",
      "Interview to Offer",
    ]);
    expect(events.map((e) => e.changedAt)).toEqual([day(1), day(2), day(9), day(20)]);
  });

  it("rejects moves the rules don't allow and leaves no trace", async () => {
    const app = await createApplication(db, me.id, input({ status: "interview" }), day(1));
    await expect(moveApplication(db, me.id, app.id, "applied")).rejects.toMatchObject({
      code: "INVALID_TRANSITION",
    });
    await expect(moveApplication(db, me.id, app.id, "interview")).rejects.toMatchObject({
      code: "INVALID_TRANSITION",
    });
    const after = await getApplication(db, me.id, app.id);
    expect(after.status).toBe("interview");
    expect(after.events).toHaveLength(1);
  });

  it("applies the same rules to status changes made through the edit form", async () => {
    const app = await createApplication(db, me.id, input({ status: "offer" }), day(1));
    await expect(updateApplication(db, me.id, app.id, input({ status: "wishlist" }))).rejects.toMatchObject({
      code: "INVALID_TRANSITION",
    });
    const edited = await updateApplication(
      db,
      me.id,
      app.id,
      input({ status: "offer", notes: "Negotiating" }),
    );
    expect(edited.notes).toBe("Negotiating");
    expect((await getApplication(db, me.id, app.id)).events).toHaveLength(1);
  });

  it("logs a status change made through the edit form", async () => {
    const app = await createApplication(db, me.id, input(), day(1));
    const edited = await updateApplication(
      db,
      me.id,
      app.id,
      input({ status: "applied", role: "Staff Eng" }),
      day(3),
    );
    expect(edited).toMatchObject({ status: "applied", role: "Staff Eng", appliedOn: "2026-10-03" });
    expect((await getApplication(db, me.id, app.id)).events.map(describeEvent)).toEqual([
      "Added as Wishlist",
      "Wishlist to Applied",
    ]);
  });
});

describe("listing", () => {
  beforeEach(async () => {
    await createApplication(
      db,
      me.id,
      input({ company: "Initech", role: "Backend Engineer", salaryMax: "150000" }),
      day(1),
    );
    await createApplication(
      db,
      me.id,
      input({ company: "Acme", role: "Frontend Engineer", status: "applied" }),
      day(2),
    );
    await createApplication(
      db,
      me.id,
      input({ company: "Hooli", role: "Data Analyst", salaryMax: "90000" }),
      day(3),
    );
  });

  it("defaults to most recently updated first", async () => {
    expect((await listApplications(db, me.id)).map((a) => a.company)).toEqual(["Hooli", "Acme", "Initech"]);
  });

  it("sorts by a column in either direction", async () => {
    const asc = await listApplications(db, me.id, { sort: "company" });
    expect(asc.map((a) => a.company)).toEqual(["Acme", "Hooli", "Initech"]);
    const bySalary = await listApplications(db, me.id, { sort: "salaryMax", dir: "desc" });
    // Acme has no salary listed: it goes last in both directions.
    expect(bySalary.map((a) => a.company)).toEqual(["Initech", "Hooli", "Acme"]);
    const bySalaryAsc = await listApplications(db, me.id, { sort: "salaryMax", dir: "asc" });
    expect(bySalaryAsc.map((a) => a.company)).toEqual(["Hooli", "Initech", "Acme"]);
  });

  it("filters by status and by a case-insensitive search on company or role", async () => {
    expect((await listApplications(db, me.id, { status: "applied" })).map((a) => a.company)).toEqual([
      "Acme",
    ]);
    expect((await listApplications(db, me.id, { q: "ENGINEER" })).map((a) => a.company).sort()).toEqual([
      "Acme",
      "Initech",
    ]);
    expect(await listApplications(db, me.id, { q: "hoo", status: "applied" })).toEqual([]);
  });

  it("treats LIKE wildcards in the search as literal text", async () => {
    expect(await listApplications(db, me.id, { q: "%" })).toEqual([]);
    expect(await listApplications(db, me.id, { q: "_" })).toEqual([]);
  });
});

describe("deleting", () => {
  it("removes the application and its timeline", async () => {
    const app = await createApplication(db, me.id, input());
    await deleteApplication(db, me.id, app.id);
    await expect(getApplication(db, me.id, app.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("answers not-found for malformed ids instead of a database error", async () => {
    await expect(getApplication(db, me.id, "not-a-uuid")).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(deleteApplication(db, me.id, "1; drop table")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
