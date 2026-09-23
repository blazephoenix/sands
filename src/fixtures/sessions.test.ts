import { beforeEach, describe, expect, it } from "vitest"

import { listSessionEntries } from "./entries"
import { turnSchema } from "@/domain/session"

import {
  OPENINGS,
  SESSION_IDS,
  TANGENTIAL_STEPS,
  TURN_SCRIPT,
  claimOpening,
  commitTurn,
  createSession,
  getSessionView,
  listTurns,
  pendingBackground,
  pickOpening,
  pickStep,
  planOpening,
  planTurn,
  settleBackground,
} from "./sessions"
import { StoreError, resetStore } from "./store"
import { WORLD_IDS } from "./ids"

beforeEach(() => {
  resetStore()
})

function newSession() {
  return createSession({ worldId: WORLD_IDS.ready, mode: "harness" }).session
}

/** A new Session that has had its Opening, with the Opening's background work finished. */
function freshSession() {
  const session = newSession()
  commitTurn(planOpening(session.id))
  settleBackground(session.id, { force: true })
  return session
}

function play(sessionId: string, input: string, options: Parameters<typeof planTurn>[2] = {}) {
  settleBackground(sessionId, { force: true })
  return commitTurn(planTurn(sessionId, input, options))
}

describe("picking a script step", () => {
  it("prefers the unplayed step with the most keyword hits", () => {
    expect(pickStep("I search the quay by the chandlery", new Set(), 0).key).toBe("docks")
    expect(pickStep("I ask Amanda what the victims had in common", new Set(), 0).key).toBe("amanda")
  })

  it("skips played steps and falls back to a tangential step", () => {
    const amanda = TURN_SCRIPT.find((step) => step.key === "amanda")!
    expect(TANGENTIAL_STEPS).toContain(pickStep("I ask Amanda", new Set([amanda.passage]), 0))
    expect(TANGENTIAL_STEPS).toContain(pickStep("I light a pipe", new Set(), 1))
  })
})

describe("playing a Turn", () => {
  it("builds a Turn from the Session's state and saves it with pending background work", () => {
    const session = freshSession()
    const { turn } = play(session.id, "I ask Dr. Pryce about the wounds.")
    expect(turn.idx).toBe(1)
    expect(turn.playerInput).toBe("I ask Dr. Pryce about the wounds.")
    expect(turn.backgroundStatus).toBe("pending")
    expect(turn.log.discovery.map((d) => d.revealed)).toEqual([true, true])
    // C1 is required by the arrest, so finding it recovers Reputation.
    expect(turn.state.cluesFound).toHaveLength(1)
    expect(turn.state.reputation).toBe(65)
    expect(listTurns(session.id)).toHaveLength(2)
    expect(pendingBackground(session.id)?.turnId).toBe(turn.id)
  })

  it("does not plan the next Turn while background work is running", () => {
    const session = freshSession()
    commitTurn(planTurn(session.id, "I read the case file."))
    expect(() => planTurn(session.id, "I ask Amanda.")).toThrow(StoreError)
  })

  it("forces a second Round: Round 1 rejects both Drafts, Round 2 ships", () => {
    const session = freshSession()
    const { turn } = play(session.id, "I read the case file.", { rounds: "second-round" })
    expect(turn.log.rounds).toHaveLength(2)
    expect(turn.log.rounds[0].drafts.every((d) => !d.passed)).toBe(true)
    expect(turn.log.rounds[1].feedback).toHaveLength(2)
    expect(turn.flagged).toBe(false)
  })

  it("forces a flagged Turn: three failed Rounds ship the least-violating Draft", () => {
    const session = freshSession()
    const { turn } = play(session.id, "I read the case file.", { rounds: "flagged" })
    const round3 = turn.log.rounds[2].drafts
    const shipped = round3.find((d) => d.shipped)!
    expect(turn.flagged).toBe(true)
    expect(shipped.highestViolation).toBeLessThan(round3.find((d) => !d.shipped)!.highestViolation)
  })

  it.each(["win", "death", "removed"] as const)("forces the %s Ending and ends the Session", (ending) => {
    const session = freshSession()
    const { turn, session: saved } = play(session.id, "Whatever I do.", { ending })
    expect(turn.state.ending).toBe(ending)
    expect(turn.backgroundStatus).toBe("done")
    expect(saved.ending).toBe(ending)
    expect(() => planTurn(session.id, "Once more.")).toThrow(/has ended/)
  })
})

describe("background work", () => {
  it("waits until it is due unless forced", () => {
    const session = freshSession()
    commitTurn(planTurn(session.id, "I read the case file."))
    expect(settleBackground(session.id)).toBeNull()
    const settled = settleBackground(session.id, { force: true })
    expect(settled?.turn.backgroundStatus).toBe("done")
    expect(pendingBackground(session.id)).toBeNull()
  })

  it("advances the Arc when its Exit conditions are met", () => {
    const session = freshSession()
    commitTurn(planTurn(session.id, "I read the case file."))
    const settled = settleBackground(session.id, { force: true })!
    expect(settled.turn.log.background?.arcAdvancedTo).toBe(1)
    expect(settled.turn.state.arcIndex).toBe(1)
  })

  it("names new characters as proposed play Entries marked with their Turn", () => {
    const session = freshSession()
    play(session.id, "I read the case file.")
    play(session.id, "I walk to Whitechapel High Street.")
    const settled = settleBackground(session.id, { force: true })!
    expect(settled.entries).toHaveLength(1)
    expect(settled.entries[0]).toMatchObject({ name: "Ada Pruitt", source: "play", status: "proposed", sourceTurn: 2, seenAt: null })
    expect(listSessionEntries(session.id).some((e) => e.id === settled.entries[0].id)).toBe(true)
  })

  it("finishes the mid-play Session's seeded pending work", () => {
    expect(pendingBackground(SESSION_IDS.midPlay)).not.toBeNull()
    expect(settleBackground(SESSION_IDS.midPlay, { force: true })?.turn.backgroundStatus).toBe("done")
  })
})

describe("the Session view", () => {
  it("numbers Sessions within their World", () => {
    const view = getSessionView(newSession().id)
    expect(view.sessionNumber).toBe(5)
    expect(view.world.id).toBe(WORLD_IDS.ready)
    expect(view.turns).toEqual([])
    expect(getSessionView(SESSION_IDS.midPlay).sessionNumber).toBe(1)
  })
})

describe("the Opening", () => {
  it("is Turn 0: no Player input, no reading, no Outcome, written and judged at the start Location", () => {
    const session = newSession()
    const { turn } = commitTurn(planOpening(session.id))
    expect(turn).toMatchObject({ idx: 0, playerInput: null, backgroundStatus: "pending" })
    expect(turn.log.reading).toBeNull()
    expect(turn.log.outcome).toBeNull()
    expect(turn.log.discovery).toEqual([])
    expect(turn.log.timings).toMatchObject({ readingMs: 0, resolvingMs: 0 })
    expect(turn.passage).toBe(pickOpening(session.seed).passage)
    expect(turn.state).toMatchObject({ arcIndex: 0, cluesFound: [], ending: "none" })
    expect(turn.state.locationId).toBe(`${session.id}.mk-yard`)
    // Rule questions fit an Opening: no Outcome to contradict; Agency asks about arriving.
    const rules = turn.log.rounds[0].drafts[0].rules
    expect(rules.map((r) => r.rule)).not.toContain("outcome")
    expect(rules.find((r) => r.rule === "agency")?.question).toMatch(/beyond arriving/)
  })

  it("streams only writing and judging, once per Round", () => {
    const plan = planOpening(newSession().id, { rounds: "second-round" })
    expect(plan.phases.map((p) => `${p.phase}:${p.round}`)).toEqual(["writing:1", "judging:1", "writing:2", "judging:2"])
    expect(plan.turn.log.rounds).toHaveLength(2)
    const flagged = planOpening(newSession().id, { rounds: "flagged" })
    expect(flagged.turn.flagged).toBe(true)
  })

  it("is chosen by the Session's seed, so two Sessions can start differently and a replay starts the same", () => {
    expect(new Set(OPENINGS.map((o) => o.passage)).size).toBeGreaterThanOrEqual(2)
    expect(OPENINGS.map((_, seed) => pickOpening(seed).key)).toEqual(OPENINGS.map((o) => o.key))
    expect(pickOpening(OPENINGS.length + 1)).toBe(pickOpening(1))
    const a = newSession()
    const b = newSession()
    Object.assign(a, { seed: 0 })
    Object.assign(b, { seed: 1 })
    expect(planOpening(a.id).turn.passage).not.toBe(planOpening(b.id).turn.passage)
  })

  it("happens once: not for a Session that has Turns, and never two at a time", () => {
    const session = newSession()
    const release = claimOpening(session.id)
    expect(() => claimOpening(session.id)).toThrow(/already being written/)
    release()
    const again = claimOpening(session.id)
    commitTurn(planOpening(session.id))
    again()
    expect(() => planOpening(session.id)).toThrow(/already had its Opening/)
    expect(() => claimOpening(session.id)).toThrow(/already had its Opening/)
  })

  it("comes before any Player input", () => {
    expect(() => planTurn(newSession().id, "I read the case file.")).toThrow(/not had its Opening/)
  })

  it("is not mistaken for visiting the start Location: arriving meets no Exit condition", () => {
    const session = newSession()
    commitTurn(planOpening(session.id))
    const settled = settleBackground(session.id, { force: true })!
    expect(settled.turn.log.background?.arcCheck.every((check) => !check.met)).toBe(true)
    expect(settled.turn.state.arcIndex).toBe(0)
  })

  it("begins every seeded Session, chosen by that Session's seed", () => {
    for (const sessionId of Object.values(SESSION_IDS)) {
      const [opening, next] = listTurns(sessionId)
      const view = getSessionView(sessionId)
      expect(opening).toMatchObject({ idx: 0, playerInput: null })
      expect(opening.passage).toBe(pickOpening(view.session.seed).passage)
      expect(next.idx).toBe(1)
      expect(next.playerInput).not.toBeNull()
      expect(() => turnSchema.parse(opening)).not.toThrow()
    }
  })
})
