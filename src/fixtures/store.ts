/**
 * The in-memory fixture store behind the route handlers until the engine and
 * the database land (see .scratch/creation-harness-ui/README.md).
 *
 * Seeded from the per-area modules with the 1888 London case, and validated
 * against the domain schemas when it loads: a fixture that drifts from the
 * contracts throws a `FixtureError` naming the record and the field, so it
 * fails loudly in dev instead of rendering wrong.
 *
 * Area modules own their data and operations:
 * - `worlds.ts`       Worlds and Briefs
 * - `setup-script.ts` the scripted setup run (ticket 02)
 * - `entries.ts`      Entries, per World and per Session copy
 * - `sessions.ts`     Sessions, their Turns and the Turn script (ticket 04)
 *
 * The state lives on `globalThis`, so every route handler (each its own module
 * graph in dev) shares one store, and it survives hot reloads. Mutations last
 * until the dev server restarts or `resetStore()` runs.
 */
import { z } from "zod"

import { documentToBrief } from "@/brief/from-document"
import { briefSchema } from "@/domain/brief"
import { entrySchema, referencedEntryIds, type Entry } from "@/domain/entry"
import {
  sessionSchema,
  turnSchema,
  type Session,
  type Turn,
} from "@/domain/session"
import { worldSchema, type World } from "@/domain/world"
import type { SandsBlock } from "@/editor/schema-config"

import { seedEntries } from "./entries"
import { seedSessionEntries, seedSessions, seedTurns } from "./sessions"
import { seedWorlds } from "./worlds"

export type FixtureState = {
  worlds: Map<string, World>
  entries: Map<string, Entry>
  sessions: Map<string, Session>
  /** Turns by Session id, ordered by `idx`. */
  turns: Map<string, Turn[]>
}

export type FixtureSeed = {
  worlds: unknown[]
  entries: unknown[]
  sessions: unknown[]
  turns: unknown[]
}

/** A fixture that does not match the domain contracts. Thrown at load; never caught by route helpers. */
export class FixtureError extends Error {
  constructor(message: string) {
    super(`Fixture store: ${message}`)
    this.name = "FixtureError"
  }
}

/** An expected failure of a store operation, mapped to an HTTP status by `src/server/http.ts`. */
export class StoreError extends Error {
  constructor(
    readonly code: "not_found" | "conflict" | "invalid",
    message: string
  ) {
    super(message)
    this.name = "StoreError"
  }
}

function parseAll<S extends z.ZodType>(
  label: string,
  schema: S,
  records: unknown[]
): z.infer<S>[] {
  return records.map((record, index) => {
    const parsed = schema.safeParse(record)
    if (!parsed.success) {
      const id = (record as { id?: unknown })?.id ?? `#${index}`
      throw new FixtureError(
        `${label} ${String(id)} does not match its schema:\n${z.prettifyError(parsed.error)}`
      )
    }
    return parsed.data
  })
}

/**
 * Validates seed data against the schemas and against each other (every
 * reference resolves, every Brief document converts to its stored Brief), and
 * builds the store. Pure; throws `FixtureError` on the first problem.
 */
export function buildFixtureState(seed: FixtureSeed): FixtureState {
  const worlds = parseAll("World", worldSchema, seed.worlds)
  const entries = parseAll("Entry", entrySchema, seed.entries)
  const sessions = parseAll("Session", sessionSchema, seed.sessions)
  const turns = parseAll("Turn", turnSchema, seed.turns)

  const worldIds = new Set(worlds.map((w) => w.id))
  const sessionById = new Map(sessions.map((s) => [s.id, s]))
  const entryById = new Map<string, Entry>()
  const fail = (message: string): never => {
    throw new FixtureError(message)
  }

  for (const entry of entries) {
    if (entryById.has(entry.id)) fail(`Entry ${entry.id} appears twice.`)
    entryById.set(entry.id, entry)
  }

  for (const world of worlds) {
    if (world.brief) {
      const converted = documentToBrief(world.briefDoc as SandsBlock[])
      if (!converted.validation.success) {
        fail(
          `World ${world.id}'s Brief document does not pass the §7.1 rules: ${converted.issues.map((i) => i.message).join(" ")}`
        )
      }
      // Compare parsed forms: zod normalises key order.
      if (
        JSON.stringify(briefSchema.parse(converted.validation.brief)) !==
        JSON.stringify(world.brief)
      ) {
        fail(
          `World ${world.id}'s stored Brief differs from its Brief document. Regenerate it with documentToBrief.`
        )
      }
    }
  }

  for (const session of sessions) {
    if (!worldIds.has(session.worldId))
      fail(`Session ${session.id} belongs to unknown World ${session.worldId}.`)
  }

  for (const entry of entries) {
    if (!worldIds.has(entry.worldId))
      fail(`Entry ${entry.id} belongs to unknown World ${entry.worldId}.`)
    if (entry.sessionId !== null) {
      const session =
        sessionById.get(entry.sessionId) ??
        fail(`Entry ${entry.id} belongs to unknown Session ${entry.sessionId}.`)
      if (session.worldId !== entry.worldId)
        fail(`Entry ${entry.id} is in Session ${session.id} of another World.`)
      if (entry.templateId !== null) {
        const template =
          entryById.get(entry.templateId) ??
          fail(`Entry ${entry.id} copies unknown template ${entry.templateId}.`)
        if (template.sessionId !== null)
          fail(
            `Entry ${entry.id}'s template ${template.id} is itself a Session copy.`
          )
        if (template.kind !== entry.kind)
          fail(`Entry ${entry.id} has a different kind from its template.`)
      } else if (entry.source === "setup") {
        fail(
          `Session Entry ${entry.id} has no template, so it must come from play or the Author.`
        )
      }
    }
    for (const ref of referencedEntryIds(entry)) {
      const target =
        entryById.get(ref) ??
        fail(`Entry ${entry.id} refers to unknown Entry ${ref}.`)
      // A Session copy may keep pointing at a rejected World Entry it did not copy (ADR-0005: shown as broken).
      const brokenOnPurpose =
        entry.sessionId !== null &&
        target.sessionId === null &&
        target.status === "rejected" &&
        target.worldId === entry.worldId
      if (
        !brokenOnPurpose &&
        (target.worldId !== entry.worldId ||
          target.sessionId !== entry.sessionId)
      ) {
        fail(
          `Entry ${entry.id} refers to Entry ${ref} outside its own ${entry.sessionId ? "Session" : "World"}.`
        )
      }
    }
  }

  const turnsBySession = new Map<string, Turn[]>()
  for (const turn of turns) {
    if (!sessionById.has(turn.sessionId))
      fail(`Turn ${turn.id} belongs to unknown Session ${turn.sessionId}.`)
    turnsBySession.set(turn.sessionId, [
      ...(turnsBySession.get(turn.sessionId) ?? []),
      turn,
    ])
  }
  for (const [sessionId, list] of turnsBySession) {
    list.sort((a, b) => a.idx - b.idx)
    list.forEach((turn, index) => {
      if (turn.idx !== index)
        fail(
          `Session ${sessionId}'s Turns skip from ${index - 1} to ${turn.idx}.`
        )
      const location = entryById.get(turn.state.locationId)
      if (
        !location ||
        location.kind !== "location" ||
        location.sessionId !== sessionId
      ) {
        fail(
          `Turn ${turn.id}'s location ${turn.state.locationId} is not a Location in its Session.`
        )
      }
      for (const clueId of turn.state.cluesFound) {
        const clue = entryById.get(clueId)
        if (!clue || clue.kind !== "clue" || clue.sessionId !== sessionId)
          fail(`Turn ${turn.id} found unknown Clue ${clueId}.`)
      }
    })
    const session = sessionById.get(sessionId)!
    const last = list.at(-1)!
    if (last.state.ending !== session.ending) {
      fail(
        `Session ${sessionId} ends in "${session.ending}" but its last Turn's state says "${last.state.ending}".`
      )
    }
  }

  return {
    worlds: new Map(worlds.map((w) => [w.id, w])),
    entries: entryById,
    sessions: sessionById,
    turns: turnsBySession,
  }
}

export function seedFixtures(): FixtureSeed {
  return {
    worlds: seedWorlds(),
    entries: [...seedEntries(), ...seedSessionEntries()],
    sessions: seedSessions(),
    turns: seedTurns(),
  }
}

declare global {
  var __sandsFixtureStore: FixtureState | undefined
}

/** The shared store, seeded and validated on first use. */
export function getStore(): FixtureState {
  globalThis.__sandsFixtureStore ??= buildFixtureState(seedFixtures())
  return globalThis.__sandsFixtureStore
}

/** Re-seeds the store from the fixtures (tests; dev resets). */
export function resetStore(): FixtureState {
  globalThis.__sandsFixtureStore = buildFixtureState(seedFixtures())
  return globalThis.__sandsFixtureStore
}

export function nowIso() {
  return new Date().toISOString()
}

/** A fresh id with a readable prefix, e.g. `entry-1f3a9c2e`. */
export function newId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}
