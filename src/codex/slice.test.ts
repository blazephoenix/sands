import { describe, expect, it } from "vitest"

import type { Entry } from "@/domain/entry"
import { startingState } from "@/engine/initial-state"
import { londonEntries } from "@/test/london"

import { codexSlice, namedEntries } from "./slice"

const codex = () => londonEntries("w", "mk", "ready")
const ids = (list: readonly Entry[]) => list.map((e) => e.id).sort()

describe("finding the Entries a text names", () => {
  const named = (text: string) => ids(namedEntries(text, codex()))

  it("matches characters by full name, alias, given name or surname", () => {
    expect(named("Jacob bought violets from Nell.")).toEqual([
      "mk-jacob",
      "mk-nell",
    ])
    expect(named("Pryce looked up.")).toEqual(["mk-pryce"])
    expect(named("Henry looked up.")).toEqual(["mk-pryce"])
    expect(named("The clerk bowed.")).toEqual(["mk-max"])
    expect(named("Geoffrey James frowned.")).toEqual(["mk-geoffrey"])
  })

  it("matches every character a shared surname could mean", () => {
    expect(named("A Rober stood at the door.")).toEqual(["mk-josiah", "mk-max"])
  })

  it("matches places and other things by their full name only", () => {
    expect(named("Back to Spitalfields Market, then.")).toEqual([
      "mk-spitalfields",
    ])
    expect(named("The market was busy.")).toEqual([])
  })

  it("does not match inside a longer word, or a lowercase word that is also a name", () => {
    expect(named("Nellie and Jacoby laughed.")).toEqual([])
    expect(named("He will say james is fine.")).toEqual([])
  })

  it("never matches a removed Entry", () => {
    expect(named("Abberline and Tower Bridge.")).toEqual([])
  })
})

describe("the Codex slice (spec §9.3)", () => {
  const at = (locationId: string) => ({
    ...startingState("mk-yard"),
    locationId,
  })

  it("holds the current Location and its connections, the Player character, and the characters named in the input, the last Passage or the target", () => {
    const slice = codexSlice({
      entries: codex(),
      state: at("mk-whitechapel"),
      texts: ["I ask Nell what she saw.", "Amanda held out the file."],
      targetId: "mk-pryce",
      allowedReveals: [],
      discoverableClues: [],
    })
    expect(ids(slice.writer)).toEqual([
      "mk-amanda",
      "mk-docks",
      "mk-jacob",
      "mk-nell",
      "mk-pryce",
      "mk-spitalfields",
      "mk-whitechapel",
      "mk-yard",
    ])
  })

  it("adds the Allowed reveals with who holds them, and the Discoverable Clues", () => {
    const entries = codex()
    const pick = (id: string) => entries.find((e) => e.id === id)!
    const slice = codexSlice({
      entries,
      state: at("mk-spitalfields"),
      texts: [],
      targetId: null,
      allowedReveals: [pick("mk-k-nell")] as never,
      discoverableClues: [pick("mk-c4")] as never,
    })
    expect(ids(slice.writer)).toEqual(
      expect.arrayContaining(["mk-k-nell", "mk-nell", "mk-c4"])
    )
  })

  it("never gives the Writer a removed Entry, and gives the Judge their names", () => {
    const slice = codexSlice({
      entries: codex(),
      state: at("mk-docks"),
      texts: ["Abberline waved from Tower Bridge."],
      targetId: "mk-abberline",
      allowedReveals: [],
      discoverableClues: [],
    })
    expect(slice.writer.every((e) => e.status !== "rejected")).toBe(true)
    expect(ids(slice.writer)).not.toContain("mk-tower-bridge")
    expect(slice.rejectedNames.sort()).toEqual([
      "Inspector Frederick Abberline",
      "Tower Bridge",
    ])
  })
})
