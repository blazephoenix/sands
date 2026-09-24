import { describe, expect, it } from "vitest"

import { turnRequestSchema } from "./api"
import {
  isOpening,
  openingRuleIssues,
  playerTurnCount,
  turnLabel,
  turnSchema,
} from "./session"
import { openingTurn, playerTurn } from "@/test/turns"

describe("the Opening rule (spec §9.0)", () => {
  const reading = {
    intent: { value: "examine", probability: 0.9 },
    target: { value: "none", label: "none", probability: 0.8 },
    classification: {
      value: "on_script" as const,
      probability: 0.9,
      belowFloor: false,
    },
  }
  const outcome = {
    kind: "narrated" as const,
    summary: "",
    reputationDelta: 0,
    offScriptDelta: 0,
    deathRoll: null,
    ending: "none" as const,
  }

  it("allows no Player input, reading or Outcome only for Turn 0", () => {
    expect(
      openingRuleIssues({
        idx: 0,
        playerInput: null,
        log: { reading: null, outcome: null },
      })
    ).toEqual([])
    expect(
      openingRuleIssues({
        idx: 1,
        playerInput: null,
        log: { reading: null, outcome: null },
      })
    ).not.toEqual([])
  })

  it("requires a Player input, a reading and an Outcome after the Opening", () => {
    expect(
      openingRuleIssues({
        idx: 3,
        playerInput: "I ask Amanda.",
        log: { reading, outcome },
      })
    ).toEqual([])
    expect(
      openingRuleIssues({
        idx: 3,
        playerInput: "I ask Amanda.",
        log: { reading: null, outcome },
      })
    ).not.toEqual([])
  })

  it("makes Turn 0 the Opening: it cannot carry a Player input", () => {
    expect(
      openingRuleIssues({
        idx: 0,
        playerInput: "I read the case file.",
        log: { reading, outcome },
      })
    ).toHaveLength(2)
  })

  it("is enforced by the Turn schema", () => {
    const opening = openingTurn("s", "yard")
    const first = playerTurn("s", 1, "I read the case file.", "yard")
    expect(turnSchema.safeParse(opening).success).toBe(true)
    expect(turnSchema.safeParse(first).success).toBe(true)
    expect(
      turnSchema.safeParse({ ...opening, playerInput: "I arrive." }).success
    ).toBe(false)
    expect(turnSchema.safeParse({ ...first, playerInput: null }).success).toBe(
      false
    )
    expect(
      turnSchema.safeParse({ ...first, log: { ...first.log, outcome: null } })
        .success
    ).toBe(false)
  })

  it("names Turns for people: the Opening, then Turn 1, Turn 2", () => {
    expect(isOpening({ idx: 0 })).toBe(true)
    expect(turnLabel({ idx: 0 })).toBe("Opening")
    expect(turnLabel({ idx: 2 })).toBe("Turn 2")
    expect(playerTurnCount(0)).toBe(0)
    expect(playerTurnCount(1)).toBe(0)
    expect(playerTurnCount(7)).toBe(6)
  })
})

describe("the Turn request", () => {
  it("takes the Player's input, or null for the Opening", () => {
    expect(turnRequestSchema.parse({ input: "  I read the file. " })).toEqual({
      input: "I read the file.",
    })
    expect(turnRequestSchema.parse({ input: null })).toEqual({ input: null })
    expect(turnRequestSchema.safeParse({ input: "   " }).success).toBe(false)
    expect(turnRequestSchema.safeParse({}).success).toBe(false)
  })
})
