/**
 * Creating, saving and deleting Worlds. A World's name is its Skeleton's
 * Title, and its Skeleton is always the one its documents hold: both are
 * set from the documents on every save.
 */
import type { Db } from "@/db/client"
import { deleteWorldRow, getWorld, insertWorld, updateWorld } from "@/db/worlds"
import { emptySkeleton, type Skeleton } from "@/domain/skeleton"
import type { World } from "@/domain/world"
import { newId } from "@/lib/ids"
import { nowIso } from "@/lib/time"
import {
  documentToSkeleton,
  skeletonToDocument,
  type SkeletonDocument,
} from "@/skeleton/document"
import { plainText } from "@/skeleton/hidden-text"

function nameOf(skeleton: Skeleton) {
  return plainText(skeleton.story.title).trim()
}

/** A new World: an empty Skeleton, or the one given (a fixture). */
export async function createWorld(
  db: Db,
  request: { skeleton?: Skeleton } = {}
): Promise<World> {
  const skeleton = request.skeleton ?? emptySkeleton()
  const now = nowIso()
  return insertWorld(db, {
    id: newId("w"),
    name: nameOf(skeleton),
    document: skeletonToDocument(skeleton),
    skeleton,
    createdAt: now,
    updatedAt: now,
  })
}

/** Stores the editor's documents, and the Skeleton and name read from them. */
export async function saveSkeleton(
  db: Db,
  worldId: string,
  document: SkeletonDocument
) {
  const world = await getWorld(db, worldId)
  const { skeleton, notes } = documentToSkeleton(document)
  const saved = await updateWorld(db, {
    ...world,
    name: nameOf(skeleton),
    document,
    skeleton,
    updatedAt: nowIso(),
  })
  return { world: saved, notes }
}

/** Deletes a World for good, with its Sessions and their Turns. */
export async function deleteWorld(db: Db, worldId: string): Promise<void> {
  const world = await getWorld(db, worldId)
  await deleteWorldRow(db, world.id)
}
