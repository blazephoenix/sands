/**
 * Entries in the database (spec §6 `entries`): World template Entries
 * (`session_id` null) and Session copies alike.
 *
 * Rows convert to and from the `Entry` contract one-to-one; `data_json` is
 * checked against the kind's schema by `entrySchema` on the way in and out.
 * Lists come back in the order the Entries were stored.
 */
import { and, asc, eq, isNull, sql } from "drizzle-orm"

import { entrySchema, type Entry } from "@/domain/entry"

import type { Db } from "./client"
import { StoreError } from "./errors"
import { entries, type EntryRow } from "./schema"

export function entryFromRow(row: EntryRow): Entry {
  return entrySchema.parse({
    id: row.id,
    worldId: row.worldId,
    sessionId: row.sessionId,
    templateId: row.templateId,
    kind: row.kind,
    name: row.name,
    description: row.description,
    keyFacts: row.keyFacts,
    data: row.dataJson,
    source: row.source,
    sourceTurn: row.sourceTurn,
    status: row.status,
    jevFlags: row.jevFlags,
    seenAt: row.seenAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  })
}

function entryToRow(entry: Entry): EntryRow {
  const parsed = entrySchema.parse(entry)
  return {
    id: parsed.id,
    worldId: parsed.worldId,
    sessionId: parsed.sessionId,
    templateId: parsed.templateId,
    kind: parsed.kind,
    name: parsed.name,
    description: parsed.description,
    keyFacts: parsed.keyFacts,
    dataJson: parsed.data,
    source: parsed.source,
    sourceTurn: parsed.sourceTurn,
    status: parsed.status,
    jevFlags: parsed.jevFlags,
    seenAt: parsed.seenAt,
    createdAt: parsed.createdAt,
    updatedAt: parsed.updatedAt,
  }
}

/** Insertion order: SQLite's rowid grows with every insert. */
const STORED_ORDER = asc(sql`rowid`)

export function getEntry(db: Db, id: string): Entry {
  const row = db.select().from(entries).where(eq(entries.id, id)).get()
  if (!row)
    throw new StoreError(
      "not_found",
      `There is no Entry "${id}". Reload to see the current Codex.`
    )
  return entryFromRow(row)
}

/** A World's template Entries (not Session copies), in stored order. */
export function listWorldEntries(db: Db, worldId: string): Entry[] {
  return db
    .select()
    .from(entries)
    .where(and(eq(entries.worldId, worldId), isNull(entries.sessionId)))
    .orderBy(STORED_ORDER)
    .all()
    .map(entryFromRow)
}

/** A Session's Codex: its copies and the Entries invented or added in it, rejected ones included. */
export function listSessionEntries(db: Db, sessionId: string): Entry[] {
  return db
    .select()
    .from(entries)
    .where(eq(entries.sessionId, sessionId))
    .orderBy(STORED_ORDER)
    .all()
    .map(entryFromRow)
}

/** Rows per insert statement, well under SQLite's limit on bound parameters. */
const INSERT_CHUNK = 100

/** Stores new Entries, all or none. Returns them as stored. */
export function insertEntries(db: Db, list: readonly Entry[]): Entry[] {
  const rows = list.map(entryToRow)
  db.transaction((tx) => {
    for (let start = 0; start < rows.length; start += INSERT_CHUNK) {
      tx.insert(entries)
        .values(rows.slice(start, start + INSERT_CHUNK))
        .run()
    }
  })
  return rows.map(entryFromRow)
}

/** Replaces a stored Entry with this one (same id). */
export function updateEntry(db: Db, entry: Entry): Entry {
  const { id, ...row } = entryToRow(entry)
  const result = db.update(entries).set(row).where(eq(entries.id, id)).run()
  if (result.changes === 0) getEntry(db, id) // throws not_found
  return getEntry(db, id)
}
