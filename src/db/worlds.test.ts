import { beforeEach, describe, expect, it } from "vitest"

import { storeLondonWorld, testDb } from "@/test/db"
import { londonBriefDocument } from "@/test/london"

import type { OpenDatabase } from "./client"
import { insertSession } from "./sessions"
import {
  createWorld,
  getWorld,
  listWorldSummaries,
  saveBrief,
  updateWorld,
} from "./worlds"

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
