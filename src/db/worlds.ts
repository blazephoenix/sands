/**
 * Worlds in the database, and the Brief autosave rules (spec §6 `worlds`,
 * §7.1).
 *
 * Rows convert to and from the `World` contract one-to-one and are parsed
 * with `worldSchema` on the way in and out, so a stored World reads back
 * exactly as written.
 */
import { count, desc, eq } from "drizzle-orm"

import { documentToBrief } from "@/brief/from-document"
import { newBriefTemplate, randomId } from "@/brief/to-document"
import type { WorldSummary } from "@/domain/api"
import type { Brief } from "@/domain/brief"
import { worldSchema, type World } from "@/domain/world"
import type { SandsBlock } from "@/editor/schema-config"
import { newId, nowIso } from "@/lib/ids"

import type { Db } from "./client"
import { StoreError } from "./errors"
import { sessions, worlds, type WorldRow } from "./schema"

export function worldFromRow(row: WorldRow): World {
  return worldSchema.parse({
    id: row.id,
    name: row.name,
    briefDoc: row.briefDoc,
    brief: row.briefJson,
    setupStatus: row.setupStatus,
    solvability: row.solvabilityJson,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  } satisfies World)
}

function worldToRow(world: World): WorldRow {
  const parsed = worldSchema.parse(world)
  return {
    id: parsed.id,
    name: parsed.name,
    briefDoc: parsed.briefDoc,
    briefJson: parsed.brief,
    setupStatus: parsed.setupStatus,
    solvabilityJson: parsed.solvability,
    createdAt: parsed.createdAt,
    updatedAt: parsed.updatedAt,
  }
}

export function findWorld(db: Db, id: string): World | null {
  const row = db.select().from(worlds).where(eq(worlds.id, id)).get()
  return row ? worldFromRow(row) : null
}

export function getWorld(db: Db, id: string): World {
  const world = findWorld(db, id)
  if (!world)
    throw new StoreError(
      "not_found",
      `There is no World "${id}". It may have been deleted; go back to your Worlds.`
    )
  return world
}

export function insertWorld(db: Db, world: World): World {
  db.insert(worlds).values(worldToRow(world)).run()
  return getWorld(db, world.id)
}

/** Replaces a stored World with this one (same id). */
export function updateWorld(db: Db, world: World): World {
  const { id, ...row } = worldToRow(world)
  const result = db.update(worlds).set(row).where(eq(worlds.id, id)).run()
  if (result.changes === 0) getWorld(db, id) // throws not_found
  return getWorld(db, id)
}

/** The Worlds home rows, most recently updated first. */
export function listWorldSummaries(db: Db): WorldSummary[] {
  return db
    .select({
      id: worlds.id,
      name: worlds.name,
      setupStatus: worlds.setupStatus,
      sessionCount: count(sessions.id),
      createdAt: worlds.createdAt,
      updatedAt: worlds.updatedAt,
    })
    .from(worlds)
    .leftJoin(sessions, eq(sessions.worldId, worlds.id))
    .groupBy(worlds.id)
    .orderBy(desc(worlds.updatedAt), desc(worlds.createdAt))
    .all()
}

/**
 * Converts a Brief document, refusing anything conversion cannot read.
 * Returns the validated Brief, or null while the document does not pass §7.1.
 */
function briefOf(briefDoc: unknown[]): Brief | null {
  let conversion: ReturnType<typeof documentToBrief>
  try {
    conversion = documentToBrief(briefDoc as SandsBlock[])
  } catch {
    throw new StoreError(
      "invalid",
      "The Brief document is malformed, so it was not saved. Reload the page and try again."
    )
  }
  return conversion.validation.success ? conversion.validation.brief : null
}

/** Creates a World in `draft`, its Brief the new-Brief template (spec §7.1) unless a document is given. */
export function createWorld(
  db: Db,
  request: { name: string; briefDoc?: unknown[] }
): World {
  const briefDoc = request.briefDoc ?? newBriefTemplate(randomId)
  const now = nowIso()
  return insertWorld(db, {
    id: newId("w"),
    name: request.name,
    briefDoc,
    brief: briefOf(briefDoc),
    setupStatus: "draft",
    solvability: null,
    createdAt: now,
    updatedAt: now,
  })
}

/**
 * Autosave: stores the Brief document (and its validated Brief, or null) and
 * the name. The Brief is locked once setup has started (spec §6: `brief_json`
 * is locked); the name can change at any time.
 */
export function saveBrief(
  db: Db,
  worldId: string,
  request: { name?: string; briefDoc?: unknown[] }
): World {
  return db.transaction((tx) => {
    const world = getWorld(tx, worldId)
    let next: World = { ...world }
    if (request.briefDoc !== undefined) {
      if (world.setupStatus !== "draft") {
        throw new StoreError(
          "conflict",
          world.setupStatus === "drafting"
            ? "Setup is running, so the Brief is locked. Your last edits were not saved; wait for setup to finish or fail."
            : "Setup has run, so the Brief is locked. Change the World in the setup review instead."
        )
      }
      next = {
        ...next,
        briefDoc: request.briefDoc,
        brief: briefOf(request.briefDoc),
      }
    }
    if (request.name !== undefined) next = { ...next, name: request.name }
    return updateWorld(tx, { ...next, updatedAt: nowIso() })
  })
}
