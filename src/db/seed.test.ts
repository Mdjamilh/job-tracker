import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Database } from "@/db/types";
import { authenticate } from "@/server/auth";
import { listApplications } from "@/server/applications";
import { listReminders } from "@/server/reminders";
import { getStats } from "@/server/stats";
import { createTestDb } from "@/test/db";

import { DEMO_ACCOUNT, seedDemo } from "./seed";

let db: Database;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

describe("demo seed", () => {
  it("creates a demo account that can log in with the published credentials", async () => {
    const now = new Date("2026-10-23T12:00:00Z");
    await seedDemo(db, now);
    const user = await authenticate(db, DEMO_ACCOUNT.email, DEMO_ACCOUNT.password);

    const apps = await listApplications(db, user.id);
    expect(apps.length).toBeGreaterThanOrEqual(12);
    const stats = await getStats(db, user.id, now);
    expect(stats.funnel.map((s) => s.count)).toEqual([16, 13, 5, 2]);
    expect(stats.weekly.reduce((sum, w) => sum + w.count, 0)).toBeGreaterThan(8);
    expect((await listReminders(db, user.id, now)).length).toBeGreaterThan(0);
  });

  it("is idempotent", async () => {
    await seedDemo(db);
    const user = await authenticate(db, DEMO_ACCOUNT.email, DEMO_ACCOUNT.password);
    expect(await listApplications(db, user.id)).toHaveLength(16);
  });
});
