import { beforeEach, describe, expect, it } from "vitest"

import { createEntry } from "@/codex/entries"
import type { OpenDatabase } from "@/db/client"
import { insertEntries, listSessionEntries } from "@/db/entries"
import { insertTurn, listTurns, updateTurn } from "@/db/sessions"
import type { Entry } from "@/domain/entry"
import type { PlayerState, Turn } from "@/domain/session"
import { FakeDrafter } from "@/models/fake-drafter"
import { FakeJudge } from "@/models/fake-judge"
import { DrafterError } from "@/models/drafter"
import { startSession } from "@/sessions/start-session"
import { storeLondonWorld, testDb } from "@/test/db"
import { openingTurn, playerTurn } from "@/test/turns"

import { runBackgroundWork } from "./background"

let db: OpenDatabase
let sessionId: string
/** A Session copy's id: `<session>.mk-<key>`. */
const copy = (key: string) => `${sessionId}.mk-${key}`

beforeEach(() => {
  db = testDb()
  storeLondonWorld(db, { id: "w", prefix: "mk", variant: "ready" })
  sessionId = startSession(db, { worldId: "w", mode: "harness", seed: 3 })
    .session.id
})

const NO_ONE_NEW = { new_characters: { characters: [] } }

/**
 * Stores the Opening and Turns 1..n (every one's Background work done but
 * the last), and returns the last, whose Background work is pending.
 */
function played(
  n: number,
  last: { passage?: string; state?: Partial<PlayerState> } = {}
): Turn {
  const done = (turn: Turn): Turn => ({
    ...turn,
    backgroundStatus: "done",
    log: {
      ...turn.log,
      background: {
        newEntryIds: [],
        arcCheck: [],
        arcAdvancedTo: null,
        pacing: null,
        error: null,
      },
    },
  })
  const opening = openingTurn(sessionId, copy("yard"))
  insertTurn(db, n === 0 ? opening : done(opening))
  let turn = opening
  for (let idx = 1; idx <= n; idx++) {
    const next = playerTurn(sessionId, idx, `action ${idx}`, copy("yard"))
    turn =
      idx < n
        ? done(next)
        : {
            ...next,
            passage: last.passage ?? next.passage,
            log: {
              ...next.log,
              rounds: next.log.rounds.map((round) => ({
                ...round,
                drafts: round.drafts.map((d) => ({
                  ...d,
                  text: last.passage ?? d.text,
                })),
              })),
            },
            state: { ...next.state, ...last.state },
          }
    insertTurn(db, turn)
  }
  return turn
}

async function background(
  turn: Turn,
  models: { drafter?: FakeDrafter; judge?: FakeJudge } = {}
) {
  const drafter = models.drafter ?? new FakeDrafter({ outputs: NO_ONE_NEW })
  const judge = models.judge ?? new FakeJudge({ model: "jev-test" })
  await runBackgroundWork(
    { db, drafter, judge },
    { sessionId, turnId: turn.id },
    { log: () => {} }
  )
  const stored = listTurns(db, sessionId).find((t) => t.id === turn.id)!
  return { stored, drafter, judge }
}

describe("new characters (spec §9.2 step 8)", () => {
  it("adds a character the Passage names as a proposed NPC from play, and skips anyone the Codex or the Brief already has", async () => {
    const turn = played(1, {
      passage:
        "Nell waved him over. Beside her stood Mary Kelly, a lodging-house keeper, and old Carrow's clerk.",
    })
    const drafter = new FakeDrafter({
      outputs: {
        new_characters: {
          characters: [
            {
              name: "Mary Kelly",
              description: "Keeps a lodging house near the market.",
              role: "Lodging-house keeper",
              personality: null,
            },
            // Already in the Codex, by alias.
            {
              name: "Nell",
              description: "A flower seller.",
              role: null,
              personality: null,
            },
            // In the Brief, not the Codex (research: the smoke Drafter proposed him).
            {
              name: "Carrow",
              description: "A merchant.",
              role: null,
              personality: null,
            },
            // Not named in the Passage at all.
            {
              name: "Lucy Adams",
              description: "Invented.",
              role: null,
              personality: null,
            },
          ],
        },
      },
    })

    const { stored } = await background(turn, { drafter })

    const invented = listSessionEntries(db, sessionId).filter(
      (entry) => entry.source === "play"
    )
    expect(invented).toHaveLength(1)
    expect(invented[0]).toMatchObject({
      kind: "npc",
      name: "Mary Kelly",
      description: "Keeps a lodging house near the market.",
      status: "proposed",
      source: "play",
      sourceTurn: 1,
      sessionId,
      templateId: null,
      seenAt: null,
      data: { role: "Lodging-house keeper", isPlayer: false },
    })
    expect(stored.backgroundStatus).toBe("done")
    expect(stored.log.background?.newEntryIds).toEqual([invented[0].id])

    // The Drafter sees every name the story already has, not the Codex slice.
    const prompt = drafter.callsTo("new_characters")[0].request.prompt
    for (const name of ["Edmund Carrow", "Nell Garvey", "Jacob Flannery"])
      expect(prompt).toContain(name)
  })
})

describe("the Arc check (spec §9.2 step 9)", () => {
  /** A Judge that answers every Exit condition question with `met`, and the pacing question with `progress`. */
  const arcJudge = (met: number, progress = 0.9) =>
    new FakeJudge({
      model: "jev-test",
      answer: (id) =>
        id.startsWith("exit_") ? met : id === "pacing" ? progress : undefined,
    })

  it("advances the Arc when every live Exit condition of the current Arc is met, and records each answer", async () => {
    const turn = played(1)
    const judge = arcJudge(0.91)

    const { stored } = await background(turn, { judge })

    expect(judge.calls).toHaveLength(1)
    const questions = judge.calls[0].request.questions
    expect(Object.keys(questions)).toEqual(["exit_0"])
    expect(JSON.stringify(questions.exit_0)).toContain(
      "Jacob has read the case file and met Captain James."
    )
    expect(stored.log.background).toMatchObject({
      arcCheck: [
        { exitConditionId: copy("exit-1"), probability: 0.91, met: true },
      ],
      arcAdvancedTo: 1,
    })
    expect(stored.state.arcIndex).toBe(1)
  })

  it("leaves the Arc where it is while an Exit condition is unmet", async () => {
    const turn = played(1)

    const { stored } = await background(turn, { judge: arcJudge(0.2) })

    expect(stored.log.background).toMatchObject({
      arcCheck: [
        { exitConditionId: copy("exit-1"), probability: 0.2, met: false },
      ],
      arcAdvancedTo: null,
    })
    expect(stored.state.arcIndex).toBe(0)
  })

  it("asks only about Exit conditions not already met, and counts the earlier ones towards the advance", async () => {
    // A second live Exit condition for Arc 1, met on an earlier Turn.
    const earlier = played(1)
    const [second] = insertEntries(db, [
      {
        ...listSessionEntries(db, sessionId).find(
          (e) => e.id === copy("exit-1")
        )!,
        id: `${sessionId}.extra-exit`,
        templateId: null,
        name: "Met the surgeon",
        status: "accepted",
        source: "author",
        data: { arcIndex: 0, condition: "Jacob has met Dr. Pryce." },
      } as Entry,
    ])
    updateTurn(db, {
      ...earlier,
      backgroundStatus: "done",
      log: {
        ...earlier.log,
        background: {
          newEntryIds: [],
          arcCheck: [
            { exitConditionId: second.id, probability: 0.8, met: true },
          ],
          arcAdvancedTo: null,
          pacing: null,
          error: null,
        },
      },
    })
    const turn = playerTurn(sessionId, 2, "read the file", copy("yard"))
    insertTurn(db, turn)
    const judge = arcJudge(0.7)

    const { stored } = await background(turn, { judge })

    expect(Object.keys(judge.calls[0].request.questions)).toEqual(["exit_0"])
    expect(stored.log.background?.arcAdvancedTo).toBe(1)
  })

  it("never advances past the last Arc", async () => {
    const turn = played(1, { state: { arcIndex: 2 } })

    const { stored } = await background(turn, { judge: arcJudge(0.95) })

    expect(stored.log.background?.arcCheck[0]).toMatchObject({ met: true })
    expect(stored.log.background?.arcAdvancedTo).toBeNull()
    expect(stored.state.arcIndex).toBe(2)
  })

  it("does not check Exit conditions after the Opening: the Player has not acted yet", async () => {
    const turn = played(0)
    const judge = arcJudge(0.95)

    const { stored } = await background(turn, { judge })

    expect(judge.calls).toHaveLength(0)
    expect(stored.backgroundStatus).toBe("done")
    expect(stored.log.background?.arcCheck).toEqual([])
    expect(stored.state.arcIndex).toBe(0)
  })
})

describe("the pacing check (spec §9.2 step 10)", () => {
  const pacingJudge = (progress: number, met = 0.1) =>
    new FakeJudge({
      model: "jev-test",
      answer: (id) =>
        id === "pacing" ? progress : id.startsWith("exit_") ? met : undefined,
    })

  it("sets the Pacing nudge after three Turns in the Arc without progress, and does not advance the Arc", async () => {
    const turn = played(3)
    const judge = pacingJudge(0.15)

    const { stored } = await background(turn, { judge })

    const { questions, state } = judge.calls[0].request
    expect(Object.keys(questions)).toContain("pacing")
    expect(
      (state as { recent_turns: { turn: string }[] }).recent_turns.map(
        (t) => t.turn
      )
    ).toEqual(["Turn 1", "Turn 2", "Turn 3"])
    expect(stored.log.background?.pacing).toMatchObject({
      probability: 0.15,
      nudge: true,
    })
    expect(stored.state.pacingNudge.active).toBe(true)
    expect(stored.state.pacingNudge.reason).toMatch(/3 Turns/)
    expect(stored.state.arcIndex).toBe(0)
    expect(stored.log.background?.arcAdvancedTo).toBeNull()
  })

  it("does not ask before the Arc has had three Turns", async () => {
    const turn = played(2)
    const judge = pacingJudge(0.15)

    const { stored } = await background(turn, { judge })

    expect(Object.keys(judge.calls[0].request.questions)).not.toContain(
      "pacing"
    )
    expect(stored.log.background?.pacing).toBeNull()
    expect(stored.state.pacingNudge.active).toBe(false)
  })

  it("counts only Turns played in the current Arc", async () => {
    const turn = played(3, { state: { arcIndex: 1 } })
    const judge = pacingJudge(0.15)

    await background(turn, { judge })

    expect(Object.keys(judge.calls[0].request.questions)).not.toContain(
      "pacing"
    )
  })

  it("clears the nudge once the Player makes progress", async () => {
    const turn = played(3, {
      state: { pacingNudge: { active: true, reason: "stalled" } },
    })

    const { stored } = await background(turn, { judge: pacingJudge(0.8) })

    expect(stored.log.background?.pacing).toMatchObject({ nudge: false })
    expect(stored.state.pacingNudge).toEqual({ active: false, reason: null })
  })

  it("sets no nudge on a Turn that met an Exit condition", async () => {
    const turn = played(3)

    const { stored } = await background(turn, { judge: pacingJudge(0.1, 0.9) })

    expect(stored.log.background?.pacing?.nudge).toBe(false)
    expect(stored.state.pacingNudge.active).toBe(false)
  })
})

describe("a Background failure (spec §13)", () => {
  it("is recorded on the Turn as failed with its cause, and changes nothing else", async () => {
    const turn = played(3, { passage: "Mary Kelly waited by the door." })
    const drafter = new FakeDrafter({
      outputs: { new_characters: new DrafterError("the Drafter timed out") },
    })
    const judge = new FakeJudge({
      model: "jev-test",
      answer: (id) => (id.startsWith("exit_") ? 0.95 : 0.1),
    })

    const { stored } = await background(turn, { drafter, judge })

    expect(stored.backgroundStatus).toBe("failed")
    expect(stored.log.background).toEqual({
      newEntryIds: [],
      arcCheck: [],
      arcAdvancedTo: null,
      pacing: null,
      error: "the Drafter timed out",
    })
    expect(stored.log.timings.backgroundMs).not.toBeNull()
    expect(stored.state).toEqual(turn.state)
    expect(
      listSessionEntries(db, sessionId).filter((e) => e.source === "play")
    ).toEqual([])
  })
})

describe("a Codex edit while Background work runs", () => {
  it("does not propose a character the Author added meanwhile", async () => {
    const turn = played(1, { passage: "Mary Kelly waited by the door." })
    const drafter = new FakeDrafter({
      outputs: {
        new_characters: {
          characters: [
            {
              name: "Mary Kelly",
              description: "Waits by the door.",
              role: null,
              personality: null,
            },
          ],
        },
      },
    })
    const draft = drafter.draft.bind(drafter)
    drafter.draft = (async (...args: Parameters<typeof draft>) => {
      createEntry(db, {
        worldId: "w",
        sessionId,
        content: {
          kind: "npc",
          name: "Mary Kelly",
          description: "Added by the Author.",
          keyFacts: [],
          data: {
            role: "",
            age: "",
            personality: "",
            backstory: "",
            isPlayer: false,
            hiddenFields: [],
            aliases: [],
          },
        },
      })
      return draft(...args)
    }) as typeof drafter.draft

    const { stored } = await background(turn, { drafter })

    expect(
      listSessionEntries(db, sessionId).filter((e) => e.name === "Mary Kelly")
    ).toHaveLength(1)
    expect(stored.log.background?.newEntryIds).toEqual([])
  })
})
