import { describe, expect, it } from "vitest"

import { entrySchema } from "@/domain/entry"
import { londonEntries } from "@/test/london"

import { ENGINE_CONFIG, ruleVerdict } from "./config"

describe("penalties (decided 2026-09-24)", () => {
  it("are positive numbers, subtracted from Reputation", () => {
    expect(ENGINE_CONFIG.offScriptPenalty).toBe(10)
    expect(ENGINE_CONFIG.wrongTargetPenalty).toBe(15)
    expect(ENGINE_CONFIG.prematurePenalty).toBe(20)
  })

  it("makes a Decisive action with a negative penalty fail validation", () => {
    const action = londonEntries("w", "mk", "ready").find(
      (entry) => entry.kind === "decisive_action"
    )!
    expect(entrySchema.safeParse(action).success).toBe(true)
    for (const field of ["wrongTargetPenalty", "prematurePenalty"]) {
      const negative = {
        ...action,
        data: { ...action.data, [field]: -15 },
      }
      expect(entrySchema.safeParse(negative).success).toBe(false)
    }
  })
})

describe("Rule verdicts (spec §10.1)", () => {
  it("fails at p >= 0.5 and is Unsure from 0.35 up to 0.65", () => {
    expect(ruleVerdict(0.34)).toEqual({ failed: false, unsure: false })
    expect(ruleVerdict(0.35)).toEqual({ failed: false, unsure: true })
    expect(ruleVerdict(0.5)).toEqual({ failed: true, unsure: true })
    expect(ruleVerdict(0.65)).toEqual({ failed: true, unsure: false })
  })
})
