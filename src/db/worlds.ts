/**
 * Worlds in the database (spec §6 `worlds`). The rules for creating a World
 * and saving its Brief live in `src/worlds/`.
 *
 * Rows convert to and from the `World` contract one-to-one and are parsed
 * with `worldSchema` on the way in and out, so a stored World reads back
 * exactly as written.
 */
import { count, desc, eq } from "drizzle-orm"

import type { WorldSummary } from "@/domain/api"
import { worldSchema, type World } from "@/domain/world"
import { nowIso } from "@/lib/time"

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
  db.update(worlds).set(row).where(eq(worlds.id, id)).run()
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
 * Returns every World left `drafting` to `draft`, and says how many. Called
 * once when the server starts (`src/instrumentation.ts`): setup runs inside
 * the server process and holds nothing on disk but the claim, so any claim
 * left then belongs to a run that died with the previous process. Only the
 * World's status and update time change; setup stores no Entries until it
 * has finished.
 */
export function releaseInterruptedSetups(db: Db): number {
  return db
    .update(worlds)
    .set({ setupStatus: "draft", updatedAt: nowIso() })
    .where(eq(worlds.setupStatus, "drafting"))
    .run().changes
}
