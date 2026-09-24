/**
 * Test databases: in-memory SQLite with the migrations applied, and a London
 * World stored in it as setup would leave it. Used only by tests.
 */
import { openDatabase, type Db } from "@/db/client"
import { insertEntries } from "@/db/entries"
import { insertWorld } from "@/db/worlds"
import type { Entry } from "@/domain/entry"
import type { World } from "@/domain/world"
import { checkSolvability } from "@/setup/solvability"

import { londonBrief, londonEntries, testTime, type Variant } from "./london"

/** A fresh in-memory database with every migration applied. */
export function testDb() {
  return openDatabase(":memory:")
}

/**
 * Stores a London World past setup: `review` with the Codex setup drafted,
 * or `ready` with the reviewed Codex. Entry ids are `${prefix}-${key}`
 * (`wc-c2`, `mk-yard`); the stored solvability is the real check's result.
 */
export function storeLondonWorld(
  db: Db,
  options: { id: string; prefix: string; variant: Variant }
): { world: World; entries: Entry[] } {
  const { briefDoc, brief } = londonBrief(options.prefix)
  const entries = londonEntries(options.id, options.prefix, options.variant)
  const world = insertWorld(db, {
    id: options.id,
    name: "The Merchant Killings",
    briefDoc,
    brief,
    setupStatus: options.variant,
    solvability: {
      ...checkSolvability({ arcs: brief.arcs, entries }),
      checkedAt: testTime(60),
    },
    createdAt: testTime(0),
    updatedAt: testTime(60),
  })
  return { world, entries: insertEntries(db, entries) }
}
