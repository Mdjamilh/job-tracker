import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT, PgTransaction } from "drizzle-orm/pg-core";

import type * as schema from "./schema";

/** Driver-agnostic handle shared by Postgres (production) and PGlite (demo and tests). */
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

export type Transaction = PgTransaction<
  PgQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

/** Anything that can run queries: the root handle or an open transaction. */
export type Executor = Database | Transaction;
