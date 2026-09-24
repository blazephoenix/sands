/**
 * Starting a Session (spec §6; ADR-0005): the Session row and its copies of
 * every non-rejected World template Entry, written together. A World in
 * review becomes ready once its first Session starts.
 */
import type { CreateSessionResponse } from "@/domain/api"
import type { Session } from "@/domain/session"
import type { Db } from "@/db/client"
import { insertEntries, listWorldEntries } from "@/db/entries"
import { StoreError } from "@/db/errors"
import { insertSession } from "@/db/sessions"
import { getWorld, updateWorld } from "@/db/worlds"
import { newId, nowIso } from "@/lib/ids"

import { copyEntriesForSession } from "./session-copy"

/** The id of a Session's copy of a World Entry: unique, and readable in the database. */
export function copyId(sessionId: string, templateId: string) {
  return `${sessionId}.${templateId}`
}

/**
 * Starts a Session in a World that has finished setup and passed its
 * solvability check. The seed is random unless given (a Replay sets it).
 */
export function startSession(
  db: Db,
  request: { worldId: string; mode: Session["mode"]; seed?: number }
): CreateSessionResponse {
  return db.transaction((tx) => {
    const world = getWorld(tx, request.worldId)
    if (world.setupStatus === "draft" || world.setupStatus === "drafting") {
      throw new StoreError(
        "conflict",
        "This World has not finished setup. Run setup and review its Entries before starting a Session."
      )
    }
    if (!world.solvability?.passed) {
      const gap = world.solvability?.gaps[0]?.message
      throw new StoreError(
        "conflict",
        `This World is not solvable yet${gap ? `: ${gap}` : ""}. Fix the gaps in the setup review, then start again.`
      )
    }
    const now = nowIso()
    const session = insertSession(tx, {
      id: newId("s"),
      worldId: world.id,
      mode: request.mode,
      seed: request.seed ?? Math.floor(Math.random() * 2 ** 31),
      ending: "none",
      createdAt: now,
      updatedAt: now,
    })
    const entries = insertEntries(
      tx,
      copyEntriesForSession(listWorldEntries(tx, world.id), session.id, {
        now,
        newId: (entry) => copyId(session.id, entry.id),
      })
    )
    if (world.setupStatus === "review")
      updateWorld(tx, { ...world, setupStatus: "ready", updatedAt: now })
    return { session, entries }
  })
}
