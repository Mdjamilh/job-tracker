import { randomUUID } from "node:crypto";

import postgres from "postgres";

import { connectPglite, connectPostgres, migratePostgres } from "@/db/connect";
import type { Database } from "@/db/types";

/**
 * A fresh, fully migrated database for one test file.
 *
 * With DATABASE_URL set (CI runs a Postgres 17 service), each file gets its own
 * throwaway database so files can run in parallel. Otherwise it is in-memory PGlite.
 */
export async function createTestDb(): Promise<{ db: Database; close: () => Promise<void> }> {
  const url = process.env.DATABASE_URL;
  if (!url) return connectPglite();

  const name = `jt_test_${randomUUID().replaceAll("-", "")}`;
  const admin = postgres(url, { max: 1, onnotice: () => {} });
  await admin.unsafe(`CREATE DATABASE ${name}`);

  const testUrl = new URL(url);
  testUrl.pathname = `/${name}`;
  const { db, close } = await connectPostgres(testUrl.toString());
  await migratePostgres(db);

  return {
    db,
    close: async () => {
      await close();
      await admin.unsafe(`DROP DATABASE IF EXISTS ${name}`);
      await admin.end();
    },
  };
}
