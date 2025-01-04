import path from "node:path";

import * as schema from "./schema";
import type { Database } from "./types";

export const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");

/** A real Postgres connection (Neon, Supabase, Docker, the CI service container...). */
export async function connectPostgres(url: string): Promise<{ db: Database; close: () => Promise<void> }> {
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const postgres = (await import("postgres")).default;
  const client = postgres(url, { max: 5, prepare: false, onnotice: () => {} });
  return { db: drizzle(client, { schema }), close: () => client.end() };
}

/**
 * Embedded Postgres compiled to WASM. `dataDir` undefined means in memory,
 * which is what Vercel (read-only filesystem), builds and tests use.
 */
export async function connectPglite(dataDir?: string): Promise<{ db: Database; close: () => Promise<void> }> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const client = new PGlite(dataDir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return { db, close: () => client.close() };
}

export async function migratePostgres(db: Database) {
  const { migrate } = await import("drizzle-orm/postgres-js/migrator");
  // The postgres-js migrator only needs the dialect + session, which every PgDatabase has.
  await migrate(db as Parameters<typeof migrate>[0], { migrationsFolder: MIGRATIONS_FOLDER });
}
