/**
 * The four tables of spec §6: Worlds, Entries, Sessions and Turns.
 *
 * Columns keep the spec's snake_case names; the domain contracts in
 * `src/domain/` use the matching camelCase names. JSON columns hold exactly
 * what the contracts hold, so a row read back parses to the object written.
 * Timestamps are ISO strings, as the contracts carry them.
 *
 * Constraints mirror the contract rules that fit in SQL, so a bad write fails
 * in the database as well as in zod:
 * - a World past `draft` has a validated Brief;
 * - only play Entries have a source Turn; only Session copies point at a template;
 * - one Turn per `(session_id, idx)`, which refuses a second Opening;
 * - Turn 0, and only Turn 0, has no Player input.
 *
 * Imports are relative, not `@/`, so drizzle-kit can load this file on its own.
 */
import { sql, type SQL } from "drizzle-orm"
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core"

import type { Brief } from "../domain/brief"
import {
  ENTRY_KINDS,
  entrySourceSchema,
  entryStatusSchema,
  type JevFlag,
} from "../domain/entry"
import {
  backgroundStatusSchema,
  endingSchema,
  sessionSchema,
  type PlayerState,
  type TurnLog,
} from "../domain/session"
import { setupStatusSchema, type SolvabilityResult } from "../domain/world"

/** A zod enum's values as the non-empty tuple drizzle's `enum` option wants. */
function enumTuple<T extends string>(schema: { options: readonly T[] }) {
  return schema.options as unknown as [T, ...T[]]
}

const SETUP_STATUSES = enumTuple(setupStatusSchema)
const ENTRY_SOURCES = enumTuple(entrySourceSchema)
const ENTRY_STATUSES = enumTuple(entryStatusSchema)
const SESSION_MODES = enumTuple(sessionSchema.shape.mode)
const ENDINGS = enumTuple(endingSchema)
const BACKGROUND_STATUSES = enumTuple(backgroundStatusSchema)

/** `column in ('a', 'b', ...)`, for a check constraint on an enum column. */
function isOneOf(column: AnySQLiteColumn, options: readonly string[]): SQL {
  const list = options.map((option) => `'${option}'`).join(", ")
  return sql`${column} in (${sql.raw(list)})`
}

export const worlds = sqliteTable(
  "worlds",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    /** The Brief editor's BlockNote document, so the editor reopens exactly as left. */
    briefDoc: text("brief_doc", { mode: "json" }).$type<unknown[]>().notNull(),
    /** The validated Brief; null until the document passes spec §7.1. */
    briefJson: text("brief_json", { mode: "json" }).$type<Brief>(),
    setupStatus: text("setup_status", { enum: SETUP_STATUSES }).notNull(),
    solvabilityJson: text("solvability_json", {
      mode: "json",
    }).$type<SolvabilityResult>(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    check("worlds_setup_status", isOneOf(t.setupStatus, SETUP_STATUSES)),
    check(
      "worlds_brief_past_draft",
      sql`${t.setupStatus} = 'draft' or ${t.briefJson} is not null`
    ),
  ]
)

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    worldId: text("world_id")
      .notNull()
      .references(() => worlds.id, { onDelete: "cascade" }),
    mode: text("mode", { enum: SESSION_MODES }).notNull(),
    seed: integer("seed").notNull(),
    ending: text("ending", { enum: ENDINGS }).notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    index("sessions_world").on(t.worldId, t.createdAt),
    check("sessions_mode", isOneOf(t.mode, SESSION_MODES)),
    check("sessions_ending", isOneOf(t.ending, ENDINGS)),
  ]
)

export const entries = sqliteTable(
  "entries",
  {
    id: text("id").primaryKey(),
    worldId: text("world_id")
      .notNull()
      .references(() => worlds.id, { onDelete: "cascade" }),
    /** Null for a World template Entry; set for a Session's copy. */
    sessionId: text("session_id").references(() => sessions.id, {
      onDelete: "cascade",
    }),
    /** For Session copies: the World Entry it was copied from. Null for play inventions. */
    templateId: text("template_id").references(
      (): AnySQLiteColumn => entries.id
    ),
    kind: text("kind", { enum: ENTRY_KINDS }).notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    keyFacts: text("key_facts", { mode: "json" }).$type<string[]>().notNull(),
    /** Kind-specific fields (spec §6 `data_json`), checked against the kind's schema on read and write. */
    dataJson: text("data_json", { mode: "json" }).$type<unknown>().notNull(),
    source: text("source", { enum: ENTRY_SOURCES }).notNull(),
    sourceTurn: integer("source_turn"),
    status: text("status", { enum: ENTRY_STATUSES }).notNull(),
    jevFlags: text("jev_flags", { mode: "json" }).$type<JevFlag[]>().notNull(),
    /** When the Author first saw a play-invented Entry in the Codex pane (the "new" marker). */
    seenAt: text("seen_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    index("entries_world_session").on(t.worldId, t.sessionId),
    index("entries_session").on(t.sessionId),
    check("entries_kind", isOneOf(t.kind, ENTRY_KINDS)),
    check("entries_source", isOneOf(t.source, ENTRY_SOURCES)),
    check("entries_status", isOneOf(t.status, ENTRY_STATUSES)),
    check(
      "entries_source_turn",
      sql`(${t.source} = 'play') = (${t.sourceTurn} is not null)`
    ),
    check(
      "entries_template_in_session",
      sql`${t.sessionId} is not null or ${t.templateId} is null`
    ),
  ]
)

export const turns = sqliteTable(
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
    flagged: integer("flagged", { mode: "boolean" }).notNull(),
    logJson: text("log_json", { mode: "json" }).$type<TurnLog>().notNull(),
    stateJson: text("state_json", { mode: "json" })
      .$type<PlayerState>()
      .notNull(),
    backgroundStatus: text("background_status", {
      enum: BACKGROUND_STATUSES,
    }).notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("turns_session_idx").on(t.sessionId, t.idx),
    check("turns_idx", sql`${t.idx} >= 0`),
    check(
      "turns_opening_input",
      sql`(${t.idx} = 0) = (${t.playerInput} is null)`
    ),
    check(
      "turns_background_status",
      isOneOf(t.backgroundStatus, BACKGROUND_STATUSES)
    ),
  ]
)

export type WorldRow = typeof worlds.$inferSelect
export type SessionRow = typeof sessions.$inferSelect
export type EntryRow = typeof entries.$inferSelect
export type TurnRow = typeof turns.$inferSelect
