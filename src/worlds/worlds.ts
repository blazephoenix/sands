/**
 * Creating and deleting Worlds. A new World starts with an empty Skeleton and
 * no editor document; the editor builds the document from the Skeleton the
 * first time it opens one that has none (fixtures are stored the same way).
 */
import type { Db } from "@/db/client"
import { deleteWorldRow, getWorld, insertWorld } from "@/db/worlds"
import { emptySkeleton, type Skeleton } from "@/domain/skeleton"
import type { World } from "@/domain/world"
import { newId } from "@/lib/ids"
import { nowIso } from "@/lib/time"
import { plainText } from "@/skeleton/hidden-text"

export async function createWorld(
  db: Db,
  request: { name?: string; skeleton?: Skeleton } = {}
): Promise<World> {
  const skeleton = request.skeleton ?? emptySkeleton()
  const now = nowIso()
  return insertWorld(db, {
    id: newId("w"),
    name: request.name ?? plainText(skeleton.story.title).trim(),
    skeletonDoc: [],
    skeleton,
    createdAt: now,
    updatedAt: now,
  })
}

/** Deletes a World for good, with its Sessions and their Turns. */
export async function deleteWorld(db: Db, worldId: string): Promise<void> {
  const world = await getWorld(db, worldId)
  await deleteWorldRow(db, world.id)
}
