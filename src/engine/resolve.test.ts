import { describe, expect, it } from "vitest"

import type { Entry } from "@/domain/entry"
import type { Classification, PlayerState } from "@/domain/session"
import { londonEntries } from "@/test/london"

import { ENGINE_CONFIG } from "./config"
import { startingState } from "./initial-state"
import { resolve, type Intent, type Target } from "./resolve"

/** The ready London Codex: ids are `mk-<key>`; Tower Bridge and Abberline are removed. */
const codex = () => londonEntries("w", "mk", "ready")

function state(change: Partial<PlayerState> = {}): PlayerState {
  return { ...startingState("mk-yard"), ...change }
}

const entry = (key: string): Target => ({ kind: "entry", id: `mk-${key}` })

function play(
  intent: Intent,
  target: Target,
  options: {
    classification?: Classification
    state?: PlayerState
    entries?: Entry[]
    deathRoll?: number
  } = {}
) {
  return resolve({
    state: options.state ?? state(),
    entries: options.entries ?? codex(),
    intent,
    target,
    classification: options.classification ?? "on_script",
    deathRoll: options.deathRoll ?? 0.99,
  })
}

describe("move", () => {
  it("moves the Player to a live Location", () => {
    const { outcome, state } = play({ kind: "move" }, entry("whitechapel"))
    expect(outcome.action?.kind).toBe("moved")
    expect(outcome.action?.summary).toMatch(/Whitechapel High Street/)
    expect(state.locationId).toBe("mk-whitechapel")
  })

  it("refuses a move to a removed Location, a target that is not a Location, or a place not in the Codex", () => {
    for (const target of [
      entry("tower-bridge"),
      entry("nell"),
      { kind: "not_in_codex" } as const,
      { kind: "none" } as const,
    ]) {
      const { outcome, state } = play({ kind: "move" }, target)
      expect(outcome.action?.kind).toBe("move_refused")
      expect(state.locationId).toBe("mk-yard")
    }
  })

  it("still moves the Player when the move is off-script, then costs the off-script penalty", () => {
    const { outcome, state } = play({ kind: "move" }, entry("docks"), {
      classification: "off_script",
    })
    expect(outcome.action).toMatchObject({ kind: "moved", reputationDelta: 0 })
    expect(outcome.penalty).toMatchObject({
      kind: "off_script",
      reputationDelta: -10,
      offScriptDelta: 1,
    })
    expect(state.locationId).toBe("mk-docks")
    expect(state.reputation).toBe(ENGINE_CONFIG.startingReputation - 10)
    expect(state.offScriptCount).toBe(1)
  })
})

describe("question", () => {
  const ids = (list: readonly { id: string }[]) => list.map((e) => e.id)

  it("lets the target reveal only Knowledge at or below the current Band, not yet revealed", () => {
    // Nell reveals at normal; the Player starts at 60, normal Band.
    const normal = play({ kind: "question" }, entry("nell"))
    expect(normal.outcome.action?.kind).toBe("questioned")
    expect(ids(normal.allowedReveals)).toEqual(["mk-k-nell"])

    const low = play({ kind: "question" }, entry("nell"), {
      state: state({ reputation: 29 }),
    })
    expect(low.allowedReveals).toEqual([])

    const told = play({ kind: "question" }, entry("nell"), {
      state: state({ knowledgeRevealed: { "mk-nell": ["mk-k-nell"] } }),
    })
    expect(told.allowedReveals).toEqual([])
  })

  it("keeps high-Band Knowledge back until the Player is in the high Band", () => {
    expect(play({ kind: "question" }, entry("josiah")).allowedReveals).toEqual(
      []
    )
    expect(
      ids(
        play({ kind: "question" }, entry("josiah"), {
          state: state({ reputation: 70 }),
        }).allowedReveals
      )
    ).toEqual(["mk-k-josiah"])
  })

  it("reads the Band before this Turn's penalty", () => {
    const { allowedReveals, state: after } = play(
      { kind: "question" },
      entry("nell"),
      { classification: "off_script", state: state({ reputation: 30 }) }
    )
    expect(ids(allowedReveals)).toEqual(["mk-k-nell"])
    expect(after.reputation).toBe(20)
  })

  it("reveals nothing when the target is not a live character", () => {
    for (const target of [
      entry("docks"),
      entry("abberline"),
      { kind: "none" } as const,
    ]) {
      expect(play({ kind: "question" }, target).allowedReveals).toEqual([])
    }
  })
})

describe("examine", () => {
  it("makes the Clues at the current Location that are not yet found discoverable", () => {
    const here = state({ locationId: "mk-spitalfields" })
    const { outcome, discoverableClues } = play(
      { kind: "examine" },
      {
        kind: "none",
      },
      { state: here }
    )
    expect(outcome.action?.kind).toBe("examined")
    expect(discoverableClues.map((c) => c.id)).toEqual(["mk-c4"])

    expect(
      play(
        { kind: "examine" },
        { kind: "none" },
        {
          state: { ...here, cluesFound: ["mk-c4"] },
        }
      ).discoverableClues
    ).toEqual([])
    expect(
      play({ kind: "examine" }, { kind: "none" }).discoverableClues
    ).toEqual([])
  })

  it("makes nothing discoverable for any other intent", () => {
    const here = state({ locationId: "mk-spitalfields" })
    expect(
      play({ kind: "other" }, { kind: "none" }, { state: here })
        .discoverableClues
    ).toEqual([])
  })
})

describe("a Decisive action", () => {
  const arrest = { kind: "decisive", verb: "arrest" } as const
  // The ready World's arrest needs any three of C1-C4.
  const three = state({ cluesFound: ["mk-c1", "mk-c2", "mk-c3"] })

  it("fails on the right target before its Clues are found, costing its premature penalty", () => {
    const { outcome, state: after } = play(arrest, entry("max"), {
      state: state({ cluesFound: ["mk-c1", "mk-c2"] }),
    })
    expect(outcome.action).toMatchObject({
      kind: "decisive_premature",
      reputationDelta: -20,
    })
    expect(outcome.ending).toBe("none")
    expect(after.reputation).toBe(40)
  })

  it("fails on any other target, costing its wrong-target penalty", () => {
    for (const target of [
      entry("nell"),
      { kind: "not_in_codex" } as const,
      { kind: "none" } as const,
    ]) {
      const { outcome, state: after } = play(arrest, target, { state: three })
      expect(outcome.action).toMatchObject({
        kind: "decisive_wrong_target",
        reputationDelta: -15,
      })
      expect(after.reputation).toBe(45)
    }
  })

  it("wins on the right target with its Clues found, and shows the win Ending", () => {
    const { outcome, state: after } = play(arrest, entry("max"), {
      state: three,
    })
    expect(outcome.action).toMatchObject({
      kind: "decisive_success",
      reputationDelta: 0,
    })
    expect(outcome.ending).toBe("win")
    expect(outcome.endingReason).toMatch(/^Won/)
    expect(after.ending).toBe("win")
  })

  it("counts a found Clue the Author removed later", () => {
    const entries = codex().map((e) =>
      e.id === "mk-c1" ? { ...e, status: "rejected" } : e
    ) as Entry[]
    expect(
      play(arrest, entry("max"), { state: three, entries }).outcome.ending
    ).toBe("win")
  })

  it("falls back to the default wrong-target penalty when no action has the verb", () => {
    const { outcome } = play({ kind: "decisive", verb: "duel" }, entry("max"))
    expect(outcome.action).toMatchObject({
      kind: "decisive_wrong_target",
      reputationDelta: -ENGINE_CONFIG.wrongTargetPenalty,
    })
  })

  it("uses the action's own penalties", () => {
    const entries = codex().map((e) =>
      e.kind === "decisive_action"
        ? {
            ...e,
            data: { ...e.data, prematurePenalty: 5, wrongTargetPenalty: 7 },
          }
        : e
    ) as Entry[]
    expect(
      play(arrest, entry("max"), { entries }).outcome.action?.reputationDelta
    ).toBe(-5)
    expect(
      play(arrest, entry("nell"), { entries }).outcome.action?.reputationDelta
    ).toBe(-7)
  })

  it("continues play when success does not win the story", () => {
    const entries = codex().map((e) =>
      e.kind === "decisive_action"
        ? { ...e, data: { ...e.data, onSuccess: "none" } }
        : e
    ) as Entry[]
    const { outcome } = play(arrest, entry("max"), { state: three, entries })
    expect(outcome.action?.kind).toBe("decisive_success")
    expect(outcome.ending).toBe("none")
  })
})

describe("a reckless action", () => {
  it("rolls for death first at the current Arc's odds; lethal ends the Session and nothing else resolves", () => {
    const { outcome, state: after } = play({ kind: "move" }, entry("docks"), {
      classification: "reckless",
      deathRoll: 0.19,
    })
    expect(outcome.action).toBeNull()
    expect(outcome.penalty).toMatchObject({
      kind: "reckless",
      deathRoll: { odds: 0.2, roll: 0.19, lethal: true },
    })
    expect(outcome.ending).toBe("death")
    expect(after).toMatchObject({ locationId: "mk-yard", ending: "death" })
  })

  it("survives a roll at or above the odds, and the intent resolves with no penalty", () => {
    const { outcome, state: after } = play({ kind: "move" }, entry("docks"), {
      classification: "reckless",
      deathRoll: 0.2,
    })
    expect(outcome.action?.kind).toBe("moved")
    expect(outcome.penalty).toMatchObject({
      kind: "reckless",
      reputationDelta: 0,
      deathRoll: { lethal: false },
    })
    expect(after.locationId).toBe("mk-docks")
    expect(outcome.ending).toBe("none")
  })

  it("takes the odds from the Arc, the last value for later Arcs", () => {
    const odds = (arcIndex: number) =>
      play(
        { kind: "other" },
        { kind: "none" },
        {
          classification: "reckless",
          state: state({ arcIndex }),
        }
      ).outcome.penalty.deathRoll?.odds
    expect([0, 1, 2, 5].map(odds)).toEqual([0.2, 0.35, 0.5, 0.5])
  })
})

describe("off-script warnings and removal", () => {
  const offScript = (change: Partial<PlayerState>) =>
    play(
      { kind: "other" },
      { kind: "none" },
      {
        classification: "off_script",
        state: state(change),
      }
    )

  it("delivers a warning at the second and third off-script actions, once each", () => {
    expect(offScript({ offScriptCount: 0 }).warning).toBeNull()
    const second = offScript({ offScriptCount: 1 })
    expect(second.warning).toBe(2)
    expect(second.state.warningsGiven).toEqual([2])
    const third = offScript({ offScriptCount: 2, warningsGiven: [2] })
    expect(third.warning).toBe(3)
    expect(third.state.warningsGiven).toEqual([2, 3])
    expect(third.outcome.ending).toBe("none")
  })

  it("removes the Player at the fourth off-script action", () => {
    const fourth = offScript({ offScriptCount: 3, warningsGiven: [2, 3] })
    expect(fourth.warning).toBeNull()
    expect(fourth.outcome.ending).toBe("removed")
    expect(fourth.outcome.endingReason).toMatch(/off-script/)
    expect(fourth.state.ending).toBe("removed")
  })

  it("removes the Player when Reputation reaches 0, and never takes it below 0", () => {
    const { outcome, state: after } = offScript({ reputation: 8 })
    expect(after.reputation).toBe(0)
    expect(outcome.ending).toBe("removed")
    expect(outcome.endingReason).toMatch(/Reputation/)
  })

  it("does not warn for an on-script action", () => {
    expect(
      play(
        { kind: "other" },
        { kind: "none" },
        {
          state: state({ offScriptCount: 1 }),
        }
      ).warning
    ).toBeNull()
  })
})

describe("every intent × Classification", () => {
  const intents: [Intent, Target][] = [
    [{ kind: "move" }, entry("whitechapel")],
    [{ kind: "examine" }, { kind: "none" }],
    [{ kind: "question" }, entry("nell")],
    [{ kind: "decisive", verb: "arrest" }, entry("max")],
    [{ kind: "other" }, { kind: "none" }],
  ]
  const expected: Record<Classification, { rep: number; count: number }> = {
    on_script: { rep: 0, count: 0 },
    tangential: { rep: 0, count: 0 },
    off_script: { rep: -10, count: 1 },
    reckless: { rep: 0, count: 0 },
  }

  it("applies the intent and the Classification's effect together", () => {
    for (const [intent, target] of intents) {
      const alone = play(intent, target)
      for (const classification of Object.keys(expected) as Classification[]) {
        const { outcome, state: after } = play(intent, target, {
          classification,
        })
        expect(outcome.action).toEqual(alone.outcome.action)
        expect(outcome.penalty.reputationDelta).toBe(
          expected[classification].rep
        )
        expect(after.offScriptCount).toBe(expected[classification].count)
        expect(after.reputation).toBe(
          alone.state.reputation + expected[classification].rep
        )
      }
    }
  })
})
