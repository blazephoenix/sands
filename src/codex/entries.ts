/**
 * The Author's changes to the Codex (spec §7.2, §8 step 4): accept, reject,
 * restore, edit and mark-seen one Entry, or add a new one, in a World or in
 * one Session's Codex.
 *
 * Every change to a World template Entry re-runs the solvability check and
 * stores the result on the World, so `GET /api/worlds/[id]` returns it and
 * Start follows it.
 *
 * A change to a Session's Codex (edits in play, spec §7.2) takes effect from
 * the next Turn. It re-checks the Session's solvability from where the Player
 * stands and what they have found, and answers the result so the Codex pane
 * can warn of a Gap; the change saves either way. Clues already found stay
 * found (they live in the Turns' state, which no Codex change touches). Only
 * the Location the Player stands in cannot be removed.
 */
import type {
  CreateEntryRequest,
  PatchEntryRequest,
  PatchEntryResponse,
} from "@/domain/api"
import {
  ENTRY_KIND_LABELS,
  entryContentSchema,
  isLiveEntry,
  type Entry,
} from "@/domain/entry"
import { hasFinishedSetup, type SolvabilityResult } from "@/domain/world"
import type { Db } from "@/db/client"
import {
  getEntry,
  insertEntries,
  listSessionEntries,
  listWorldEntries,
  updateEntry,
} from "@/db/entries"
import { StoreError } from "@/db/errors"
import { getSession, listTurns } from "@/db/sessions"
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

/** Where the Player stands and what they have found: after the latest Turn, or at the start before the Opening. */
function progressOf(db: Db, sessionId: string, entries: readonly Entry[]) {
  const latest = listTurns(db, sessionId).at(-1)
  if (latest)
    return {
      locationId: latest.state.locationId,
      cluesFound: latest.state.cluesFound,
    }
  const start = entries.find(
    (e) => e.kind === "location" && isLiveEntry(e) && e.data.isStart
  )
  return start ? { locationId: start.id, cluesFound: [] } : null
}

/**
 * A Session's solvability as its Codex stands, from where the Player stands
 * and with the Clues they have found (spec §7.2). Not stored: it is cheap to
 * check whenever it is asked for.
 */
export function sessionSolvability(
  db: Db,
  sessionId: string
): SolvabilityResult {
  const session = getSession(db, sessionId)
  const brief = getWorld(db, session.worldId).brief
  const entries = listSessionEntries(db, sessionId)
  return {
    ...checkSolvability({
      arcs: brief?.arcs ?? [],
      entries,
      play: progressOf(db, sessionId, entries) ?? undefined,
    }),
    checkedAt: nowIso(),
  }
}

/** Refuses to remove the Location the Player stands in: the next Turn would start nowhere. */
function assertNotWhereThePlayerIs(db: Db, entry: Entry) {
  if (entry.sessionId === null || entry.kind !== "location") return
  const here = progressOf(
    db,
    entry.sessionId,
    listSessionEntries(db, entry.sessionId)
  )
  if (here?.locationId !== entry.id) return
  const name = entry.name.trim() || "this Location"
  throw new StoreError(
    "conflict",
    `The Player is at ${name} now, so it cannot be removed. It can be removed once the Player has moved on.`
  )
}

/**
 * Accept, reject, restore, edit or mark-seen one Entry (World template or
 * Session copy). Locked Entries come from the Brief and cannot change.
 *
 * `solvability` in the result: for a World template Entry, the World's result
 * re-checked after this change and stored (mark-seen changes nothing the check
 * reads, so it returns the stored result); for a Session copy, the Session's.
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
        assertNotWhereThePlayerIs(tx, entry)
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
    if (saved.sessionId !== null)
      return {
        entry: saved,
        solvability: sessionSolvability(tx, saved.sessionId),
      }
    const solvability =
      request.action === "mark-seen"
        ? getWorld(tx, saved.worldId).solvability
        : recheckSolvability(tx, saved.worldId)
    return { entry: saved, solvability }
  })
}

/** Stores an Entry the Author added in the Entry editor (source author, status accepted), and re-checks the World's or the Session's solvability. */
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
        saved.sessionId === null
          ? recheckSolvability(tx, world.id)
          : sessionSolvability(tx, saved.sessionId),
    }
  })
}
