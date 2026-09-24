/**
 * The Author's changes to the Codex (spec §7.2, §8 step 4): accept, reject,
 * restore, edit and mark-seen one Entry, or add a new one, in a World or in
 * one Session's Codex.
 *
 * Every change to a World template Entry re-runs the solvability check and
 * stores the result on the World, so `GET /api/worlds/[id]` returns it and
 * Start follows it. Session copies answer null: their edits take effect from
 * the next Turn.
 */
import type {
  CreateEntryRequest,
  PatchEntryRequest,
  PatchEntryResponse,
} from "@/domain/api"
import {
  ENTRY_KIND_LABELS,
  entryContentSchema,
  type Entry,
} from "@/domain/entry"
import { hasFinishedSetup, type SolvabilityResult } from "@/domain/world"
import type { Db } from "@/db/client"
import {
  getEntry,
  insertEntries,
  listWorldEntries,
  updateEntry,
} from "@/db/entries"
import { StoreError } from "@/db/errors"
import { getSession } from "@/db/sessions"
import { getWorld, updateWorld } from "@/db/worlds"
import { newId } from "@/lib/ids"
import { nowIso } from "@/lib/time"
import { checkSolvability } from "@/setup/solvability"

/**
 * Re-runs the solvability check over a World's template Entries and stores
 * the result on the World. Only a World past setup has a result to keep: a
 * World in draft has no Entries yet, and while setup runs (drafting) setup
 * owns the check. For those, the stored result comes back unchanged.
 */
export function recheckSolvability(
  db: Db,
  worldId: string
): SolvabilityResult | null {
  const world = getWorld(db, worldId)
  if (!world.brief || !hasFinishedSetup(world)) return world.solvability
  const checkedAt = nowIso()
  const solvability: SolvabilityResult = {
    ...checkSolvability({
      arcs: world.brief.arcs,
      entries: listWorldEntries(db, world.id),
    }),
    checkedAt,
  }
  updateWorld(db, { ...world, solvability, updatedAt: checkedAt })
  return solvability
}

/**
 * Accept, reject, restore, edit or mark-seen one Entry (World template or
 * Session copy). Locked Entries come from the Brief and cannot change.
 *
 * `solvability` in the result: for a World template Entry, the World's result
 * re-checked after this change and stored (mark-seen changes nothing the check
 * reads, so it returns the stored result); for a Session copy, null.
 */
export function patchEntry(
  db: Db,
  id: string,
  request: PatchEntryRequest
): PatchEntryResponse {
  return db.transaction((tx) => {
    const entry = getEntry(tx, id)
    if (entry.status === "locked") {
      throw new StoreError(
        "conflict",
        `${entry.name || "This Entry"} comes from the Brief and is locked. Change it in the Brief instead.`
      )
    }
    const updatedAt = nowIso()
    let next: Entry
    switch (request.action) {
      case "accept":
        next = { ...entry, status: "accepted", updatedAt }
        break
      case "reject":
        next = { ...entry, status: "rejected", updatedAt }
        break
      case "restore":
        next = { ...entry, status: request.status, updatedAt }
        break
      case "edit": {
        if (request.content.kind !== entry.kind) {
          const from = ENTRY_KIND_LABELS[entry.kind].singular
          const to = ENTRY_KIND_LABELS[request.content.kind].singular
          throw new StoreError(
            "invalid",
            `An edit cannot change an Entry's kind (${from} to ${to}). Add a new ${to} Entry instead.`
          )
        }
        next = {
          ...entry,
          ...request.content,
          status: "edited",
          updatedAt,
        } as Entry
        break
      }
      case "mark-seen":
        next = { ...entry, seenAt: entry.seenAt ?? updatedAt }
        break
    }
    const saved = updateEntry(tx, next)
    if (saved.sessionId !== null) return { entry: saved, solvability: null }
    const solvability =
      request.action === "mark-seen"
        ? getWorld(tx, saved.worldId).solvability
        : recheckSolvability(tx, saved.worldId)
    return { entry: saved, solvability }
  })
}

/** Stores an Entry the Author added in the Entry editor (source author, status accepted); a World Entry re-checks solvability. */
export function createEntry(
  db: Db,
  request: CreateEntryRequest
): PatchEntryResponse {
  return db.transaction((tx) => {
    const world = getWorld(tx, request.worldId)
    if (request.sessionId !== null) {
      const session = getSession(tx, request.sessionId)
      if (session.worldId !== world.id) {
        throw new StoreError(
          "not_found",
          `There is no Session "${request.sessionId}" in this World.`
        )
      }
    }
    const content = entryContentSchema.parse(request.content)
    const now = nowIso()
    const [saved] = insertEntries(tx, [
      {
        ...content,
        id: newId("entry"),
        worldId: world.id,
        sessionId: request.sessionId,
        templateId: null,
        source: "author",
        sourceTurn: null,
        status: "accepted",
        jevFlags: [],
        seenAt: null,
        createdAt: now,
        updatedAt: now,
      } as Entry,
    ])
    return {
      entry: saved,
      solvability:
        saved.sessionId === null ? recheckSolvability(tx, world.id) : null,
    }
  })
}
