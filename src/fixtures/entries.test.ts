import { beforeEach, describe, expect, it } from "vitest"

import { checkSolvability } from "@/setup/solvability"

import { createEntry, patchEntry } from "./entries"
import { SESSION_IDS } from "./ids"
import { resetStore } from "./store"
import { WORLD_IDS, getWorld, listWorldEntries } from "./worlds"

beforeEach(() => {
  resetStore()
})

const REVIEW = WORLD_IDS.review
const C2 = "wc-c2"

describe("solvability after every change to a World Entry (spec §7.2, §8 step 4)", () => {
  it("rejecting a required Clue fails the World, naming the Clue, and restoring it passes again", () => {
    const rejected = patchEntry(C2, { action: "reject" })
    expect(rejected.solvability).toMatchObject({
      passed: false,
      gaps: [{ code: "missing_clue", entryId: C2 }],
    })
    expect(rejected.solvability?.gaps[0].message).toContain("C2")
    expect(getWorld(REVIEW).solvability).toEqual(rejected.solvability)

    const restored = patchEntry(C2, { action: "restore", status: "proposed" })
    expect(restored.solvability).toMatchObject({ passed: true, gaps: [] })
    expect(getWorld(REVIEW).solvability).toEqual(restored.solvability)
  })

  it("counts Clues needed: the ready World's arrest takes any three of its four Clues", () => {
    expect(patchEntry("mk-c2", { action: "reject" }).solvability).toMatchObject(
      { passed: true, gaps: [] }
    )
    const { solvability } = patchEntry("mk-c3", { action: "reject" })
    expect(solvability?.passed).toBe(false)
    expect(solvability?.gaps.map((gap) => gap.entryId)).toEqual([
      "mk-c2",
      "mk-c3",
    ])
  })

  it("stamps each result with the time it was checked", () => {
    const before = getWorld(REVIEW).solvability!.checkedAt
    const { solvability } = patchEntry(C2, { action: "accept" })
    expect(Date.parse(solvability!.checkedAt)).toBeGreaterThan(
      Date.parse(before)
    )
  })

  it("re-checks an edit against the edited content", () => {
    const clue = listWorldEntries(REVIEW).find((entry) => entry.id === C2)!
    if (clue.kind !== "clue") throw new Error("wc-c2 is a Clue")
    const { entry, solvability } = patchEntry(C2, {
      action: "edit",
      content: {
        kind: "clue",
        name: clue.name,
        description: clue.description,
        keyFacts: clue.keyFacts,
        data: { ...clue.data, redHerring: true },
      },
    })
    expect(entry.status).toBe("edited")
    expect(solvability).toMatchObject({
      passed: false,
      gaps: [{ code: "red_herring_required", entryId: C2 }],
    })
  })

  it("re-checks when the Author adds an Entry, so a new Exit condition can close an Arc's gap", () => {
    expect(
      patchEntry("wc-exit-2", { action: "reject" }).solvability
    ).toMatchObject({
      passed: false,
      gaps: [{ code: "arc_without_exit_condition", arcIndex: 1 }],
    })
    const { solvability } = createEntry({
      worldId: REVIEW,
      sessionId: null,
      content: {
        kind: "exit_condition",
        name: "Trade learned",
        description: "",
        keyFacts: [],
        data: { arcIndex: 1, condition: "Jacob knows the trade." },
      },
    })
    expect(solvability).toMatchObject({ passed: true, gaps: [] })
    expect(getWorld(REVIEW).solvability?.passed).toBe(true)
  })

  it("leaves the World's result alone when a Session copy changes, and answers null", () => {
    const before = getWorld(WORLD_IDS.ready).solvability
    const copy = `${SESSION_IDS.midPlay}.mk-c2`
    expect(patchEntry(copy, { action: "reject" }).solvability).toBeNull()
    expect(getWorld(WORLD_IDS.ready).solvability).toEqual(before)
  })

  it("seeds each set-up World with the result the real check gives", () => {
    for (const worldId of [WORLD_IDS.review, WORLD_IDS.ready]) {
      const world = getWorld(worldId)
      const { passed, gaps } = world.solvability!
      expect({ passed, gaps }).toEqual(
        checkSolvability({
          arcs: world.brief!.arcs,
          entries: listWorldEntries(worldId),
        })
      )
    }
  })
})
