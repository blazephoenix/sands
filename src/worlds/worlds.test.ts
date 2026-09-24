import { beforeEach, describe, expect, it } from "vitest"

import { storeLondonWorld, testDb } from "@/test/db"
import { londonBriefDocument } from "@/test/london"

import type { OpenDatabase } from "@/db/client"
import {
  getEntry,
  insertEntries,
  listSessionEntries,
  listWorldEntries,
} from "@/db/entries"
import {
  getSession,
  insertSession,
  insertTurn,
  listTurns,
} from "@/db/sessions"
import {
  findWorld,
  getWorld,
  listWorldSummaries,
  updateWorld,
} from "@/db/worlds"
import { copyId, startSession } from "@/sessions/start-session"
import { openingTurn, playerTurn } from "@/test/turns"

import { createWorld, deleteWorld, saveBrief } from "./worlds"

let db: OpenDatabase

beforeEach(() => {
  db = testDb()
})

describe("creating a World", () => {
  it("stores a draft World whose Brief is the new-Brief template", () => {
    const world = createWorld(db, { name: "" })
    expect(world.setupStatus).toBe("draft")
    const types = (world.briefDoc as { type: string }[])
      .map((b) => b.type)
      .filter((t) => t !== "paragraph")
    expect(types).toEqual([
      "setting",
      "character",
      "arc",
      "arc",
      "arc",
      "ending",
    ])
    // The template's Character is unnamed, so the Brief does not pass §7.1 yet.
    expect(world.brief).toBeNull()
    expect(getWorld(db, world.id)).toEqual(world)
  })

  it("stores the validated Brief of a document that passes §7.1", () => {
    const world = createWorld(db, {
      name: "London",
      briefDoc: londonBriefDocument("n"),
    })
    expect(world.brief?.arcs).toHaveLength(3)
  })
})

describe("Brief autosave (spec §7.1)", () => {
  it("stores the document, and the validated Brief once it passes §7.1", () => {
    const world = createWorld(db, { name: "" })
    const saved = saveBrief(db, world.id, {
      name: "The Merchant Killings",
      briefDoc: londonBriefDocument("s"),
    })
    expect(saved.name).toBe("The Merchant Killings")
    expect(saved.brief?.characters.find((c) => c.isPlayer)?.name).toBe(
      "Jacob Flannery"
    )
    expect(getWorld(db, world.id)).toEqual(saved)
    expect(getWorld(db, world.id).briefDoc).toEqual(londonBriefDocument("s"))
  })

  it("stores null for a document that does not pass §7.1 yet", () => {
    const world = createWorld(db, {
      name: "",
      briefDoc: londonBriefDocument("s"),
    })
    const saved = saveBrief(db, world.id, { briefDoc: [] })
    expect(saved.brief).toBeNull()
    expect(saved.briefDoc).toEqual([])
  })

  it("refuses a Brief change once setup has started, but still renames the World", () => {
    const { world } = storeLondonWorld(db, {
      id: "w",
      prefix: "wc",
      variant: "review",
    })
    expect(() => saveBrief(db, world.id, { briefDoc: [] })).toThrow(
      expect.objectContaining({
        code: "conflict",
        message: expect.stringMatching(/Brief is locked/),
      })
    )
    updateWorld(db, { ...getWorld(db, world.id), setupStatus: "drafting" })
    expect(() => saveBrief(db, world.id, { briefDoc: [] })).toThrow(
      /Setup is running/
    )
    expect(getWorld(db, world.id).briefDoc).toEqual(world.briefDoc)
    expect(saveBrief(db, world.id, { name: "Renamed" }).name).toBe("Renamed")
  })

  it("refuses a malformed document instead of storing it", () => {
    const world = createWorld(db, { name: "" })
    expect(() =>
      saveBrief(db, world.id, {
        briefDoc: [{ type: "character", content: 42 }],
      })
    ).toThrow(/malformed/)
    expect(getWorld(db, world.id)).toEqual(world)
  })

  it("answers not found for an unknown World", () => {
    expect(() => saveBrief(db, "nope", { name: "x" })).toThrow(
      expect.objectContaining({ code: "not_found" })
    )
  })
})

describe("the Worlds home list", () => {
  it("lists every World with its Session count, most recently updated first", () => {
    storeLondonWorld(db, { id: "w-ready", prefix: "mk", variant: "ready" })
    insertSession(db, {
      id: "s",
      worldId: "w-ready",
      mode: "harness",
      seed: 1,
      ending: "none",
      createdAt: "2026-09-21T10:00:00.000Z",
      updatedAt: "2026-09-21T10:00:00.000Z",
    })
    const fresh = createWorld(db, { name: "New" })
    const summaries = listWorldSummaries(db)
    expect(summaries.map((w) => [w.id, w.sessionCount])).toEqual([
      [fresh.id, 0],
      ["w-ready", 1],
    ])
    expect(summaries[0]).toEqual({
      id: fresh.id,
      name: "New",
      setupStatus: "draft",
      sessionCount: 0,
      createdAt: fresh.createdAt,
      updatedAt: fresh.updatedAt,
    })
  })
})

describe("deleting a World", () => {
  /** A ready World with two Sessions: one played, with a play Entry, and one not started. */
  function playedWorld(id: string, prefix: string) {
    storeLondonWorld(db, { id, prefix, variant: "ready" })
    const played = startSession(db, { worldId: id, mode: "harness", seed: 1 })
    const idle = startSession(db, { worldId: id, mode: "harness", seed: 2 })
    const yard = copyId(played.session.id, `${prefix}-yard`)
    insertTurn(db, openingTurn(played.session.id, yard))
    insertTurn(db, playerTurn(played.session.id, 1, "I read the file.", yard))
    insertEntries(db, [
      {
        ...getEntry(db, `${prefix}-yard`),
        id: `${played.session.id}.play-cellar`,
        sessionId: played.session.id,
        templateId: null,
        name: "The cellar",
        source: "play",
        sourceTurn: 1,
        status: "proposed",
      },
    ])
    return { played: played.session.id, idle: idle.session.id }
  }

  it("deletes the World with its Sessions, Turns and Entries, and nothing of another World", () => {
    const gone = playedWorld("w-gone", "g")
    const kept = playedWorld("w-kept", "k")
    const keptEntries = listWorldEntries(db, "w-kept")
    const keptCopies = listSessionEntries(db, kept.played)

    deleteWorld(db, "w-gone")

    expect(findWorld(db, "w-gone")).toBeNull()
    for (const sessionId of [gone.played, gone.idle]) {
      expect(() => getSession(db, sessionId)).toThrow(
        expect.objectContaining({ code: "not_found" })
      )
      expect(listTurns(db, sessionId)).toEqual([])
      expect(listSessionEntries(db, sessionId)).toEqual([])
    }
    expect(listWorldEntries(db, "w-gone")).toEqual([])
    expect(listWorldSummaries(db).map((w) => w.id)).toEqual(["w-kept"])

    expect(listWorldEntries(db, "w-kept")).toEqual(keptEntries)
    expect(listSessionEntries(db, kept.played)).toEqual(keptCopies)
    expect(listTurns(db, kept.played)).toHaveLength(2)
    expect(getSession(db, kept.idle).worldId).toBe("w-kept")
  })

  it("refuses to save a Turn that finishes after its World was deleted", () => {
    const { played } = playedWorld("w", "g")
    const late = playerTurn(played, 2, "I open the cellar.", copyId(played, "g-yard"))
    deleteWorld(db, "w")
    expect(() => insertTurn(db, late)).toThrow(
      expect.objectContaining({ code: "not_found" })
    )
    expect(listTurns(db, played)).toEqual([])
  })

  it("refuses, with a conflict, a World whose setup is running, and deletes nothing", () => {
    const { world, entries } = storeLondonWorld(db, {
      id: "w",
      prefix: "wc",
      variant: "review",
    })
    const running = updateWorld(db, { ...world, setupStatus: "drafting" })
    expect(() => deleteWorld(db, "w")).toThrow(
      expect.objectContaining({
        code: "conflict",
        message: expect.stringMatching(/^Setup is running/),
      })
    )
    expect(getWorld(db, "w")).toEqual(running)
    expect(listWorldEntries(db, "w")).toEqual(entries)
  })

  it("answers not found for an unknown World", () => {
    expect(() => deleteWorld(db, "nope")).toThrow(
      expect.objectContaining({ code: "not_found" })
    )
  })
})
