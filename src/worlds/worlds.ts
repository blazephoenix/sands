/**
 * Creating a World and saving its Brief (spec §7.1): the new-Brief template,
 * conversion on every save, and the lock once setup has started.
 */
import { documentToBrief } from "@/brief/from-document"
import { newBriefTemplate, randomId } from "@/brief/to-document"
import type { Brief } from "@/domain/brief"
import { isBriefLocked, type World } from "@/domain/world"
import type { Db } from "@/db/client"
import { StoreError } from "@/db/errors"
import {
  deleteWorldRow,
  getWorld,
  insertWorld,
  updateWorld,
} from "@/db/worlds"
import type { SandsBlock } from "@/editor/schema-config"
import { newId } from "@/lib/ids"
import { nowIso } from "@/lib/time"

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
      if (isBriefLocked(world)) {
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

/**
 * Deletes a World for good, with its Sessions, their Turns and every Entry.
 * Refused while setup is running (`drafting`), because setup is still writing
 * to the World. The check and the delete share one transaction.
 */
export function deleteWorld(db: Db, worldId: string): void {
  db.transaction((tx) => {
    const world = getWorld(tx, worldId)
    if (world.setupStatus === "drafting") {
      throw new StoreError(
        "conflict",
        "Setup is running for this World, so it cannot be deleted. Wait for setup to finish or fail, then try again."
      )
    }
    deleteWorldRow(tx, world.id)
  })
}
