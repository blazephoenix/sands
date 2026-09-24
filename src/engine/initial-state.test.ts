import { describe, expect, it } from "vitest"

import type { Entry } from "@/domain/entry"
import { londonEntries } from "@/test/london"

import { ENGINE_CONFIG } from "./config"
import { initialState } from "./initial-state"

const codex = () => londonEntries("w", "mk", "ready")

describe("the Player state before the Opening", () => {
  it("starts at the start Location, in the first Arc, with the starting Reputation and nothing found", () => {
    expect(initialState(codex())).toEqual({
      locationId: "mk-yard",
      arcIndex: 0,
      cluesFound: [],
      knowledgeRevealed: {},
      reputation: ENGINE_CONFIG.startingReputation,
      offScriptCount: 0,
      warningsGiven: [],
      pacingNudge: { active: false, reason: null },
      ending: "none",
    })
  })

  it("is null when the start Location is removed, even with other live Locations", () => {
    const entries = codex().map((entry) =>
      entry.id === "mk-yard" ? { ...entry, status: "rejected" } : entry
    ) as Entry[]
    expect(initialState(entries)).toBeNull()
  })

  it("is null when there is no live Location to start in", () => {
    expect(
      initialState(codex().filter((entry) => entry.kind !== "location"))
    ).toBeNull()
  })
})
