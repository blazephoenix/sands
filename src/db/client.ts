/**
 * The database: Postgres (docker-compose.yml) through node-postgres, and
 * PGlite in memory for tests (`src/test/db.ts`). Both are Drizzle's
 * `PgDatabase`, so every query runs on either.
 *
 * `getDb()` opens `DATABASE_URL` once per server process and applies any
 * pending migrations from `src/db/migrations/` before the first query, so
 * `pnpm dev` needs no manual step beyond `docker compose up -d`. The handle
 * lives on `globalThis`, so every route handler (each its own module graph in
 * dev) shares one pool and it survives hot reloads.
 *
 * Every function that reads or writes takes a `Db`, which is either the
 * database or a transaction inside it.
 */
import path from "node:path"

import { drizzle } from "drizzle-orm/node-postgres"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core"

/** The database or a transaction inside it, on either driver. */
export type Db = PgDatabase<PgQueryResultHKT>

export const MIGRATIONS_FOLDER = path.join(
  process.cwd(),
  "src",
  "db",
  "migrations"
)

declare global {
  var __sandsDb: { url: string; db: Promise<Db> } | undefined
}

async function open(url: string): Promise<Db> {
  const db = drizzle({ connection: { connectionString: url } })
  try {
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER })
  } catch (error) {
    await db.$client.end()
    throw error
  }
  return db
}

/** The server's database: `DATABASE_URL`, opened and migrated on first use. */
export function getDb(): Promise<Db> {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set on the server. Add it to .env.local (see .env.example), run `docker compose up -d`, and restart."
    )
  }
  const current = globalThis.__sandsDb
  if (current?.url === url) return current.db
  const db = open(url)
  // A failed open is not cached, so the next request tries again.
  db.catch(() => {
    if (globalThis.__sandsDb?.db === db) globalThis.__sandsDb = undefined
  })
  globalThis.__sandsDb = { url, db }
  return db
}
