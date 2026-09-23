import { beforeEach, describe, expect, it } from "vitest"

import { SCENARIOS } from "./scenarios"
import { resetStore, StoreError } from "./store"
import {
  createWorld,
  getWorld,
  londonBriefDocument,
  saveBrief,
  WORLD_IDS,
  worldSummaries,
} from "./worlds"

beforeEach(() => {
  resetStore()
})

describe("Worlds operations (ticket 02)", () => {
  it("lists every World with its Session count, most recently updated first", () => {
    const summaries = worldSummaries()
    expect(summaries.map((w) => w.id)).toContain(WORLD_IDS.ready)
    expect(
      summaries.find((w) => w.id === WORLD_IDS.ready)?.sessionCount
    ).toBeGreaterThan(0)
    expect(summaries.find((w) => w.id === WORLD_IDS.draft)?.sessionCount).toBe(
      0
    )
    const times = summaries.map((w) => w.updatedAt)
    expect([...times].sort().reverse()).toEqual(times)
  })

  it("creates a draft World whose Brief is the new-Brief template", () => {
    const world = createWorld({ name: "" })
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
    expect(worldSummaries()[0].id).toBe(world.id)
  })

  it("saves the Brief document and stores the validated Brief once it passes §7.1", () => {
    const world = createWorld({ name: "" })
    const saved = saveBrief(world.id, {
      name: "The Merchant Killings",
      briefDoc: londonBriefDocument("s"),
    })
    expect(saved.name).toBe("The Merchant Killings")
    expect(saved.brief?.characters.find((c) => c.isPlayer)?.name).toBe(
      "Jacob Flannery"
    )
    expect(getWorld(world.id).briefDoc).toHaveLength(
      londonBriefDocument("s").length
    )
  })

  it("locks the Brief once setup has started, but still renames the World", () => {
    expect(() => saveBrief(WORLD_IDS.review, { briefDoc: [] })).toThrow(
      StoreError
    )
    expect(saveBrief(WORLD_IDS.review, { name: "Renamed" }).name).toBe(
      "Renamed"
    )
  })

  it("rejects a malformed document instead of storing it", () => {
    const world = createWorld({ name: "" })
    expect(() =>
      saveBrief(world.id, { briefDoc: [{ type: "character", content: 42 }] })
    ).toThrow(/malformed/)
  })

  it("has the scenarios this ticket's routes read", () => {
    expect(Object.keys(SCENARIOS)).toEqual(
      expect.arrayContaining([
        "empty",
        "drafter-error",
        "solvability-failure",
        "request-error",
        "slow",
      ])
    )
  })
})
