import { beforeEach, describe, expect, it } from "vitest"

import type { OpenDatabase } from "@/db/client"
import { getSession, insertTurn, listTurns } from "@/db/sessions"
import type { TurnEvent } from "@/domain/events"
import type { PlayerState, Turn } from "@/domain/session"
import { FakeJudge, type FakeAnswerer } from "@/models/fake-judge"
import { FakeWriter, type FakeWriterOptions } from "@/models/fake-writer"
import { JudgeError } from "@/models/judge"
import { WriterError } from "@/models/writer"
import { startSession } from "@/sessions/start-session"
import { storeLondonWorld, testDb } from "@/test/db"
import { openingTurn, playerTurn } from "@/test/turns"

import { ENGINE_CONFIG } from "./config"
import { startingState } from "./initial-state"
import { deathRollFor } from "./rng"
import { runTurn } from "./turn"

let db: OpenDatabase
let sessionId: string
/** A Session copy's id: `<session>.mk-<key>`. */
const copy = (key: string) => `${sessionId}.mk-${key}`

beforeEach(() => {
  db = testDb()
  storeLondonWorld(db, { id: "w", prefix: "mk", variant: "ready" })
  sessionId = startSession(db, { worldId: "w", mode: "harness", seed: 15 })
    .session.id
})

type Reading = { intent: string; target: string; classification: string }

/** A Judge that reads the input as given, and answers Rule questions by rule and Draft text. */
function judge(
  reading: Reading | null,
  options: {
    /** Probability for a Rule question of Draft `draft` (its text), or undefined for a clear no. */
    rule?: (rule: string, draft: string) => number | undefined
    discovery?: number
  } = {}
) {
  const answer: FakeAnswerer = (id, _question, state) => {
    if (reading && id in reading) return reading[id as keyof Reading]
    const match = /^d(\d+)_(disc|[a-z_]+?)_\d+$/.exec(id)
    if (!match) return undefined
    const [, index, kind] = match
    if (kind === "disc") return options.discovery
    const drafts = (state as { drafts: string[] }).drafts
    return options.rule?.(kind, drafts[Number(index)])
  }
  return new FakeJudge({ answer, model: "jev-test" })
}

async function play(
  input: string | null,
  models: { judge: FakeJudge; writer?: FakeWriter | FakeWriterOptions }
) {
  const events: TurnEvent[] = []
  const writer =
    models.writer instanceof FakeWriter
      ? models.writer
      : new FakeWriter(models.writer)
  await runTurn(
    { db, writer, judge: models.judge },
    { sessionId, input },
    {
      emit: (event) => events.push(event),
      elapsed: () => 0,
      signal: new AbortController().signal,
    },
    { log: () => {} }
  )
  const last = events.at(-1)!
  return { events, last, writer }
}

function shipped(last: TurnEvent): Turn {
  if (last.type !== "result")
    throw new Error(`expected a result, got ${JSON.stringify(last)}`)
  return last.turn
}

/** Stores the Opening and Turn 1, so the next Turn (2) starts from `state`. */
function after(state: Partial<PlayerState>) {
  insertTurn(db, openingTurn(sessionId, copy("yard")))
  const turn = playerTurn(sessionId, 1, "earlier", copy("yard"))
  insertTurn(db, { ...turn, state: { ...turn.state, ...state } })
}

describe("the Opening (spec §9.0; ADR-0014)", () => {
  it("writes two Drafts, has the Judge rule on both in one call, and ships Turn 0 at the start Location", async () => {
    const fakeJudge = judge(null)
    const { events, last, writer } = await play(null, { judge: fakeJudge })
    const turn = shipped(last)

    expect(events.filter((e) => e.type === "phase")).toEqual([
      { type: "phase", phase: "writing", round: 1, at: 0 },
      { type: "phase", phase: "judging", round: 1, at: 0 },
    ])
    expect(writer.calls).toHaveLength(2)
    expect(writer.calls[0].prompt).toMatch(/opening scene/)
    expect(fakeJudge.calls).toHaveLength(1)
    const ids = Object.keys(fakeJudge.calls[0].request.questions)
    expect(ids.some((id) => id.startsWith("d0_"))).toBe(true)
    expect(ids.some((id) => id.startsWith("d1_"))).toBe(true)

    expect(turn).toMatchObject({
      idx: 0,
      playerInput: null,
      flagged: false,
      state: startingState(copy("yard")),
      backgroundStatus: "done",
    })
    expect(turn.log.reading).toBeNull()
    expect(turn.log.outcome).toBeNull()
    expect(turn.log.jevModelVersion).toBe("jev-test")
    expect(listTurns(db, sessionId)).toEqual([turn])
  })
})

describe("a Turn after the Opening (spec §9.1)", () => {
  it("reads the input, resolves the Outcome, and records the Reading and the Outcome", async () => {
    after({})
    const { events, last } = await play("I walk to Whitechapel.", {
      judge: judge({
        intent: "move",
        target: "Whitechapel High Street",
        classification: "on_script",
      }),
    })
    const turn = shipped(last)
    expect(
      events.flatMap((e) => (e.type === "phase" ? [e.phase] : []))
    ).toEqual(["reading", "resolving", "writing", "judging"])
    expect(turn.idx).toBe(2)
    expect(turn.state.locationId).toBe(copy("whitechapel"))
    expect(turn.log.reading?.target).toMatchObject({
      value: copy("whitechapel"),
      label: "Whitechapel High Street",
    })
    expect(turn.log.outcome?.action?.kind).toBe("moved")
  })

  it("an off-script move still moves the Player, and costs 10 Reputation", async () => {
    after({})
    const { last } = await play(
      "I stroll off to the docks, ignoring my duty.",
      {
        judge: judge({
          intent: "move",
          target: "St Katharine Docks",
          classification: "off_script",
        }),
      }
    )
    const turn = shipped(last)
    expect(turn.state.locationId).toBe(copy("docks"))
    expect(turn.state.reputation).toBe(ENGINE_CONFIG.startingReputation - 10)
    expect(turn.log.outcome?.action?.kind).toBe("moved")
    expect(turn.log.outcome?.penalty).toMatchObject({
      kind: "off_script",
      reputationDelta: -10,
    })
  })

  it("questioning a character reveals only their Allowed reveals, and records the Discovery", async () => {
    after({})
    const { last, writer } = await play("I ask Nell what she saw.", {
      judge: judge(
        {
          intent: "question",
          target: "Nell Garvey",
          classification: "on_script",
        },
        { discovery: 0.9 }
      ),
    })
    const turn = shipped(last)
    expect(writer.calls[0].prompt).toContain(
      "She saw a young clerk leave Carrow's warehouse at dawn."
    )
    expect(turn.log.discovery).toEqual([
      expect.objectContaining({
        target: { kind: "knowledge", entryId: copy("k-nell") },
        revealed: true,
        reputationDelta: ENGINE_CONFIG.recovery,
      }),
    ])
    expect(turn.state.knowledgeRevealed).toEqual({
      [copy("nell")]: [copy("k-nell")],
    })
    expect(turn.state.cluesFound).toEqual([copy("c3")])
  })

  it("writes another Round with Retry feedback when both Drafts fail, and ships a passing Draft unflagged", async () => {
    after({})
    const { last, writer } = await play("I look around.", {
      judge: judge(
        { intent: "examine", target: "none", classification: "on_script" },
        {
          rule: (rule, draft) =>
            rule === "agency" && draft.startsWith("Bad") ? 0.85 : undefined,
        }
      ),
      writer: { drafts: ["Bad A.", "Bad B.", "Good C.", "Bad D."] },
    })
    const turn = shipped(last)
    expect(turn.log.rounds).toHaveLength(2)
    expect(turn.log.rounds[1].feedback).toEqual([
      expect.stringMatching(/^Agency \(0\.85\)/),
    ])
    expect(writer.calls[2].prompt).toMatch(/Fix these[\s\S]*Agency \(0\.85\)/)
    expect(turn.passage).toBe("Good C.")
    expect(turn.flagged).toBe(false)
  })

  it("marks a Turn shipped after three failed Rounds as Flagged, shipping the least-violating Draft", async () => {
    after({})
    const probability: Record<string, number> = {
      "A.": 0.9,
      "B.": 0.7,
      "C.": 0.95,
      "D.": 0.6,
      "E.": 0.99,
      "F.": 0.8,
    }
    const { last } = await play("I look around.", {
      judge: judge(
        { intent: "examine", target: "none", classification: "on_script" },
        {
          rule: (rule, draft) =>
            rule === "agency" ? probability[draft] : undefined,
        }
      ),
      writer: { drafts: ["A.", "B.", "C.", "D.", "E.", "F."] },
    })
    const turn = shipped(last)
    expect(turn.log.rounds).toHaveLength(3)
    expect(turn.flagged).toBe(true)
    expect(turn.passage).toBe("D.")
  })

  it("wins with the winning Decisive action on the right target with its Clues found", async () => {
    after({ cluesFound: [copy("c1"), copy("c2"), copy("c3")] })
    const { last } = await play("I arrest Max Rober.", {
      judge: judge({
        intent: "arrest",
        target: "Max Rober",
        classification: "on_script",
      }),
    })
    const turn = shipped(last)
    expect(turn.state.ending).toBe("win")
    expect(getSession(db, sessionId).ending).toBe("win")
    expect(last.type === "result" && last.session.ending).toBe("win")
  })

  it("dies on a reckless action when the Session's seeded roll is lethal", async () => {
    after({})
    expect(deathRollFor(15, 2)).toBeLessThan(0.2)
    const { last } = await play("I jump into the river.", {
      judge: judge({
        intent: "other",
        target: "none",
        classification: "reckless",
      }),
    })
    const turn = shipped(last)
    expect(turn.log.outcome?.penalty.deathRoll).toMatchObject({ lethal: true })
    expect(turn.state.ending).toBe("death")
  })
})

describe("a failed Turn (spec §13)", () => {
  beforeEach(() => after({}))
  const reading = {
    intent: "examine",
    target: "none",
    classification: "on_script",
  }

  it("ends with writer_error when the Writer fails, with nothing in the Session changed", async () => {
    const { last } = await play("I look around.", {
      judge: judge(reading),
      writer: { drafts: ["Fine.", new WriterError("rate limited")] },
    })
    expect(last).toMatchObject({ type: "error", code: "writer_error" })
    expect(last.type === "error" && last.message).toMatch(/rate limited/)
    expect(listTurns(db, sessionId)).toHaveLength(2)
    expect(getSession(db, sessionId).ending).toBe("none")
  })

  it("ends with judge_outage when the Judge fails, with nothing in the Session changed", async () => {
    const failing = new FakeJudge({
      answer: () => {
        throw new JudgeError("Jev is down")
      },
    })
    const { last } = await play("I look around.", { judge: failing })
    expect(last).toMatchObject({ type: "error", code: "judge_outage" })
    expect(listTurns(db, sessionId)).toHaveLength(2)
  })
})
