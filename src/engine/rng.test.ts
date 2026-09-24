import { describe, expect, it } from "vitest"

import { deathRollFor } from "./rng"

describe("the seeded death roll", () => {
  it("is the same for the same Session seed and Turn, so a Replay reproduces it", () => {
    expect(deathRollFor(42, 3)).toBe(deathRollFor(42, 3))
  })

  it("differs between Turns and between seeds", () => {
    expect(deathRollFor(42, 3)).not.toBe(deathRollFor(42, 4))
    expect(deathRollFor(42, 3)).not.toBe(deathRollFor(43, 3))
  })

  it("falls in [0, 1) and spreads evenly enough for odds to mean what they say", () => {
    const rolls = Array.from({ length: 2000 }, (_, turn) =>
      deathRollFor(7, turn)
    )
    expect(rolls.every((r) => r >= 0 && r < 1)).toBe(true)
    const lethal = rolls.filter((r) => r < 0.2).length / rolls.length
    expect(lethal).toBeGreaterThan(0.17)
    expect(lethal).toBeLessThan(0.23)
  })
})
