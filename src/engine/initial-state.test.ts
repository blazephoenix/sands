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

  it("falls back to the first live Location when none is marked as the start", () => {
    const entries = codex().map((entry) =>
      entry.id === "mk-yard" ? { ...entry, status: "rejected" } : entry
    ) as Entry[]
    expect(initialState(entries)?.locationId).toBe("mk-whitechapel")
  })

  it("is null when there is no live Location to start in", () => {
    expect(
      initialState(codex().filter((entry) => entry.kind !== "location"))
    ).toBeNull()
  })
})
