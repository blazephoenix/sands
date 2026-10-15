/**
 * A fresh in-memory Postgres for one test: PGlite, migrated with the same
 * files the server uses.
 *
 *   const db = await testDb()
 *
 * Route tests that call `getDb()` mock `@/db/client` to return one of these.
 */
import { PGlite } from "@electric-sql/pglite"
import { drizzle } from "drizzle-orm/pglite"
import { migrate } from "drizzle-orm/pglite/migrator"

import { MIGRATIONS_FOLDER, type Db } from "@/db/client"

export async function testDb(): Promise<Db> {
  const db = drizzle({ client: new PGlite() })
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER })
  return db
}
