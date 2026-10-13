/**
 * The SQLite database (spec §5: Drizzle over better-sqlite3).
 *
 * `getDb()` opens `DB_URL` once per server process, with WAL and foreign keys
 * on, and applies any pending migrations from `src/db/migrations/` before
 * the first query, so `pnpm dev` needs no manual step. The handle lives on
 * `globalThis`, so every route handler (each its own module graph in dev)
 * shares it and it survives hot reloads. A migration added while the dev
 * server runs is applied on its next start.
 *
 * Tests open their own in-memory database with `openDatabase(":memory:")`.
 *
 * Every function that reads or writes takes a `Db`, which is either the
 * database or a transaction inside it. better-sqlite3 is synchronous, and so
 * are the queries and transactions built on it.
 */
import { mkdirSync } from "node:fs"
import path from "node:path"

import Database from "better-sqlite3"
import type { RunResult } from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import { migrate } from "drizzle-orm/better-sqlite3/migrator"
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core"

/** The database or a transaction inside it. */
export type Db = BaseSQLiteDatabase<"sync", RunResult>

/** An open database with its connection, which `closeDb` closes. */
export type OpenDatabase = ReturnType<typeof openDatabase>

const MIGRATIONS_FOLDER = path.join(process.cwd(), "src", "db", "migrations")

/** Where the database lives when `DB_URL` is not set: the path drizzle.config.ts uses. */
export const DEFAULT_DB_URL = "./data/sands.db"

/**
 * Opens a SQLite database at a file path (created with its folder if
 * missing) or `:memory:`, and brings its schema up to date.
 */
export function openDatabase(url: string) {
  const file = url.startsWith("file:") ? url.slice("file:".length) : url
  if (file !== ":memory:") {
    mkdirSync(path.dirname(path.resolve(file)), { recursive: true })
  }
  const sqlite = new Database(file)
  sqlite.pragma("journal_mode = WAL")
  sqlite.pragma("foreign_keys = ON")
  sqlite.pragma("busy_timeout = 5000")
  const db = drizzle({ client: sqlite })
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER })
  return db
}

declare global {
  var __sandsDb: { url: string; db: OpenDatabase } | undefined
}

/** The server's database: `DB_URL`, opened and migrated on first use. */
export function getDb(): Db {
  const url = process.env.DB_URL || DEFAULT_DB_URL
  const current = globalThis.__sandsDb
  if (current?.url === url) return current.db
  current?.db.$client.close()
  const db = openDatabase(url)
  globalThis.__sandsDb = { url, db }
  return db
}

/** Closes the server's database; the next `getDb()` opens it again. For tests. */
export function closeDb() {
  globalThis.__sandsDb?.db.$client.close()
  globalThis.__sandsDb = undefined
}
