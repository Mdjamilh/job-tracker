import "server-only";

import path from "node:path";

import { connectPglite, connectPostgres } from "./connect";
import { seedDemo } from "./seed";
import type { Database } from "./types";

declare global {
  // Cached across hot reloads in development so we don't open a new pool per edit.
  var __db: Promise<Database> | undefined;
}

/** True when there is no real database and the app runs on throwaway demo data. */
export function isDemoMode(): boolean {
  return !process.env.DATABASE_URL;
}

async function connect(): Promise<Database> {
  const url = process.env.DATABASE_URL;
  if (url) return (await connectPostgres(url)).db;

  // No DATABASE_URL: run an embedded Postgres (PGlite) so the app works with
  // zero setup. It lives in memory on Vercel and during builds (parallel
  // workers must not share a data directory), and in .pglite/ locally.
  const inMemory =
    Boolean(process.env.VERCEL) ||
    process.env.PGLITE_IN_MEMORY === "1" ||
    process.env.NEXT_PHASE === "phase-production-build";
  const { db } = await connectPglite(inMemory ? undefined : path.join(process.cwd(), ".pglite"));
  await seedDemo(db);
  return db;
}

export function getDb(): Promise<Database> {
  globalThis.__db ??= connect().catch((error) => {
    globalThis.__db = undefined;
    throw error;
  });
  return globalThis.__db;
}
