/**
 * Worlds in the database. Rows convert to and from the `World` contract
 * one-to-one and are parsed with `worldSchema` on the way in and out, so a
 * stored World reads back exactly as written.
 */
import { count, desc, eq } from "drizzle-orm"

import { worldSchema, type World } from "@/domain/world"
import { toIso } from "@/lib/time"

import type { Db } from "./client"
import { StoreError } from "./errors"
import { sessions, worlds, type WorldRow } from "./schema"

function worldFromRow(row: WorldRow): World {
  return worldSchema.parse({
    ...row,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  } satisfies World)
}

export async function findWorld(db: Db, id: string): Promise<World | null> {
  const [row] = await db.select().from(worlds).where(eq(worlds.id, id))
  return row ? worldFromRow(row) : null
}

export async function getWorld(db: Db, id: string): Promise<World> {
  const world = await findWorld(db, id)
  if (!world)
    throw new StoreError(
      "not_found",
      `There is no World "${id}". It may have been deleted; go back to your Worlds.`
    )
  return world
}

export async function insertWorld(db: Db, world: World): Promise<World> {
  await db.insert(worlds).values(worldSchema.parse(world))
  return getWorld(db, world.id)
}

/** Replaces a stored World with this one (same id). */
export async function updateWorld(db: Db, world: World): Promise<World> {
  const { id, ...row } = worldSchema.parse(world)
  await db.update(worlds).set(row).where(eq(worlds.id, id))
  return getWorld(db, id)
}

/** Deletes a World; the foreign keys cascade to its Sessions and their Turns. */
export async function deleteWorldRow(db: Db, id: string): Promise<void> {
  await db.delete(worlds).where(eq(worlds.id, id))
}

/** Every World with its Session count, most recently updated first. */
export async function listWorldsWithSessionCounts(db: Db) {
  const rows = await db
    .select({ world: worlds, sessionCount: count(sessions.id) })
    .from(worlds)
    .leftJoin(sessions, eq(sessions.worldId, worlds.id))
    .groupBy(worlds.id)
    .orderBy(desc(worlds.updatedAt), desc(worlds.createdAt))
  return rows.map((row) => ({
    world: worldFromRow(row.world),
    sessionCount: row.sessionCount,
  }))
}
