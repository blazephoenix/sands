/**
 * The three tables: Worlds, Sessions and Turns.
 *
 * JSON columns are `jsonb` and hold exactly what the domain contracts in
 * `src/domain/` hold, so a row read back parses to the object written.
 * Timestamps are `timestamptz`, written as ISO strings and read back through
 * `toIso` in `src/lib/time.ts`.
 *
 * Constraints mirror the contract rules that fit in SQL, so a bad write fails
 * in the database as well as in zod:
 * - one Turn per `(session_id, idx)`, which refuses a second Opening and two
 *   tabs writing the same Turn;
 * - Turn 0, and only Turn 0, has no Player input.
 *
 * Imports are relative, not `@/`, so drizzle-kit can load this file on its own.
 */
import { sql } from "drizzle-orm"
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"

import type { ReachedEnding, WriterLog } from "../domain/session"
import type { Skeleton } from "../domain/skeleton"
import type { SkeletonDocument } from "../skeleton/document"

const timestamps = {
  createdAt: timestamp("created_at", {
    withTimezone: true,
    mode: "string",
  }).notNull(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true,
    mode: "string",
  }).notNull(),
}

export const worlds = pgTable("worlds", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  /** The Skeleton editor's documents. */
  document: jsonb("document").$type<SkeletonDocument>().notNull(),
  /** The Skeleton read from those documents on their last save. */
  skeleton: jsonb("skeleton").$type<Skeleton>().notNull(),
  ...timestamps,
})

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    worldId: text("world_id")
      .notNull()
      .references(() => worlds.id, { onDelete: "cascade" }),
    /** The World's Skeleton as it stood when the Session started. */
    skeleton: jsonb("skeleton").$type<Skeleton>().notNull(),
    /** Null while the Session is in play. */
    ending: jsonb("ending").$type<ReachedEnding>(),
    ...timestamps,
  },
  (t) => [index("sessions_world").on(t.worldId, t.createdAt)]
)

export const turns = pgTable(
  "turns",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    /** 0-based, monotonic per Session. 0 is the Opening. */
    idx: integer("idx").notNull(),
    /** Null exactly for the Opening. */
    playerInput: text("player_input"),
    passage: text("passage").notNull(),
    choices: jsonb("choices").$type<string[]>().notNull(),
    ending: jsonb("ending").$type<ReachedEnding>(),
    log: jsonb("log").$type<WriterLog>().notNull(),
    createdAt: timestamps.createdAt,
  },
  (t) => [
    uniqueIndex("turns_session_idx").on(t.sessionId, t.idx),
    check("turns_idx", sql`${t.idx} >= 0`),
    check(
      "turns_opening_input",
      sql`(${t.idx} = 0) = (${t.playerInput} is null)`
    ),
  ]
)

export type WorldRow = typeof worlds.$inferSelect
export type SessionRow = typeof sessions.$inferSelect
export type TurnRow = typeof turns.$inferSelect
