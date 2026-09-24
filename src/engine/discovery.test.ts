import { describe, expect, it } from "vitest"

import type { PlayerState } from "@/domain/session"
import { londonEntries } from "@/test/london"

import { applyDiscovery } from "./discovery"
import { startingState } from "./initial-state"

const codex = () => londonEntries("w", "mk", "ready")

function state(change: Partial<PlayerState> = {}): PlayerState {
  return { ...startingState("mk-yard"), ...change }
}

const knowledge = (id: string, probability: number) => ({
  target: { kind: "knowledge" as const, entryId: id },
  question: `Did the draft reveal ${id}?`,
  probability,
})
const clue = (id: string, probability: number) => ({
  target: { kind: "clue" as const, entryId: id },
  question: `Did the draft reveal ${id}?`,
  probability,
})

describe("Discovery (spec §9.1 step 6)", () => {
  it("records revealed Knowledge, finds the Clue it carries, and gives the recovery for a Clue a Decisive action needs", () => {
    const { state: after, discovery } = applyDiscovery(state(), codex(), [
      knowledge("mk-k-nell", 0.91),
    ])
    expect(after.knowledgeRevealed).toEqual({ "mk-nell": ["mk-k-nell"] })
    expect(after.cluesFound).toEqual(["mk-c3"])
    expect(after.reputation).toBe(65)
    expect(discovery).toEqual([
      {
        ...knowledge("mk-k-nell", 0.91),
        revealed: true,
        reputationDelta: 5,
      },
    ])
  })

  it("finds a revealed Clue, with no recovery for one no Decisive action needs", () => {
    const { state: after, discovery } = applyDiscovery(state(), codex(), [
      clue("mk-c4", 0.8),
      clue("mk-c5", 0.7),
    ])
    expect(after.cluesFound).toEqual(["mk-c4", "mk-c5"])
    expect(after.reputation).toBe(65)
    expect(discovery.map((d) => d.reputationDelta)).toEqual([5, 0])
  })

  it("changes nothing for an answer below 0.5", () => {
    const before = state()
    const { state: after, discovery } = applyDiscovery(before, codex(), [
      knowledge("mk-k-nell", 0.49),
    ])
    expect(after).toEqual(before)
    expect(discovery[0]).toMatchObject({ revealed: false, reputationDelta: 0 })
  })

  it("never finds a Clue twice, and keeps Reputation in range", () => {
    const { state: after } = applyDiscovery(
      state({ reputation: 98, cluesFound: ["mk-c3"] }),
      codex(),
      [knowledge("mk-k-nell", 0.9), clue("mk-c4", 0.9)]
    )
    expect(after.cluesFound).toEqual(["mk-c3", "mk-c4"])
    expect(after.reputation).toBe(100)
  })
})
