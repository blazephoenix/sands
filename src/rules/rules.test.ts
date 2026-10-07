import { describe, expect, it } from "vitest"

import { codexSlice } from "@/codex/slice"
import type { Brief } from "@/domain/brief"
import type { Entry } from "@/domain/entry"
import type { PlayerState, Rule } from "@/domain/session"
import { buildDirective } from "@/engine/direct"
import { startingState } from "@/engine/initial-state"
import { resolve, type Intent, type Target } from "@/engine/resolve"
import type { JudgeJson, NoulQuestion } from "@/models/judge"
import { londonBrief, londonEntries } from "@/test/london"

import {
  chooseShipped,
  discoveryQuestions,
  judgeState,
  readDraft,
  retryFeedback,
  ruleQuestions,
  type SceneContext,
} from "./rules"

const londonCodex = () => londonEntries("w", "mk", "ready")

/** A scene in the test World: the Opening, or a Turn resolved from an intent. */
function scene(
  options: {
    turn?: { input: string; intent: Intent; target: Target }
    state?: Partial<PlayerState>
    brief?: Brief
    entries?: Entry[]
  } = {}
): SceneContext {
  const brief = options.brief ?? londonBrief("p").brief
  const entries = options.entries ?? londonCodex()
  const before = { ...startingState("mk-yard"), ...options.state }
  const resolution = options.turn
    ? resolve({
        state: before,
        entries,
        intent: options.turn.intent,
        target: options.turn.target,
        classification: "on_script",
        deathRoll: 0.99,
      })
    : null
  const state = resolution?.state ?? before
  const directive = buildDirective({
    brief,
    entries,
    state,
    resolution,
    playerInput: options.turn?.input ?? null,
    metExitConditionIds: [],
  })
  return {
    brief,
    entries,
    state,
    playerInput: options.turn?.input ?? null,
    outcome: resolution?.outcome ?? null,
    directive,
    slice: codexSlice({
      entries,
      state,
      texts: options.turn ? [options.turn.input] : [],
      targetId:
        options.turn?.target.kind === "entry" ? options.turn.target.id : null,
      allowedReveals: resolution?.allowedReveals ?? [],
      discoverableClues: resolution?.discoverableClues ?? [],
    }),
    allowedReveals: resolution?.allowedReveals ?? [],
    discoverableClues: resolution?.discoverableClues ?? [],
  }
}

const questionNell = {
  input: "I buy a bunch of violets and ask Nell what she saw.",
  intent: { kind: "question" },
  target: { kind: "entry", id: "mk-nell" },
} as const

const DRAFT =
  "Nell took the coin and looked at Jacob for a long moment. Dr. Pryce's cab rattled past."

const byRule = (questions: ReturnType<typeof ruleQuestions>, rule: Rule) =>
  questions.filter((q) => q.rule === rule)

/** The question text a Noul asks, whether plain or structured. */
function asked(question: NoulQuestion): string {
  const { instructions } = question
  return typeof instructions === "string"
    ? instructions
    : String((instructions as { question: JudgeJson }).question)
}

describe("Rule questions (spec §10.3)", () => {
  it("asks every question about the Draft it judges, by its index", () => {
    const questions = ruleQuestions(scene({ turn: questionNell }), 1, DRAFT)
    expect(
      questions.every((q) => asked(q.question).includes("`drafts[1]`"))
    ).toBe(true)
    expect(
      questions.every(
        (q) => q.question.criteria?.true && q.question.criteria?.false
      )
    ).toBe(true)
  })

  it("Character drift: one question per character the Draft names, with their entry beside it, never the Player character", () => {
    const drift = byRule(
      ruleQuestions(scene({ turn: questionNell }), 0, DRAFT),
      "character_drift"
    )
    expect(drift.map((q) => q.label)).toEqual([
      "Does Nell Garvey act against their personality or backstory?",
      "Does Dr. Henry Pryce act against their personality or backstory?",
    ])
    const instructions = drift[0].question.instructions as {
      character: { name: string; personality: string }
    }
    expect(instructions.character.name).toBe("Nell Garvey")
    expect(drift[0].question.criteria?.false).toMatch(
      /Behaviour the entry allows is not drift/
    )
  })

  it("Arc: later Arcs' events and contradicting the current Arc, split; no later-Arc question in the last Arc", () => {
    expect(byRule(ruleQuestions(scene(), 0, DRAFT), "arc")).toHaveLength(2)
    expect(
      byRule(
        ruleQuestions(scene({ state: { arcIndex: 2 } }), 0, DRAFT),
        "arc"
      ).map((q) => asked(q.question))
    ).toEqual(["Does `drafts[0]` contradict `current_arc`?"])
  })

  it("Location: set elsewhere, against the Location's entry, and a new place to travel to", () => {
    expect(
      byRule(ruleQuestions(scene(), 0, DRAFT), "location").map((q) =>
        asked(q.question)
      )
    ).toEqual([
      "Does `drafts[0]` take place somewhere other than `current_location`?",
      "Does `drafts[0]` describe `current_location` against its description?",
      "Does `drafts[0]` name a place a character could travel to that is not in `known_places`?",
    ])
  })

  it("Knowledge: only Knowledge Entries not allowed this Turn, and what the narrator gives away", () => {
    const opening = byRule(ruleQuestions(scene(), 0, DRAFT), "knowledge")
    expect(opening).toHaveLength(2)
    const [reveal, narration] = opening
    expect(reveal.question.instructions).toMatchObject({
      knowledge: [
        {
          character: "Nell Garvey",
          fact: "She saw a young clerk leave Carrow's warehouse at dawn.",
        },
        {
          character: "Dr. Henry Pryce",
          fact: "The same blade killed all three men.",
        },
      ],
    })
    expect(reveal.question.criteria?.false).toMatch(
      /something new about themselves, their past or what they want/
    )
    expect(asked(narration.question)).toMatch(
      /^Leaving aside what characters say aloud, does the narrator/
    )
  })

  it("Knowledge: a Turn's Allowed reveals are not withheld, and a Draft naming no one who knows anything has no reveal question", () => {
    const [reveal] = byRule(
      ruleQuestions(scene({ turn: questionNell }), 0, DRAFT),
      "knowledge"
    )
    expect(reveal.question.instructions).toMatchObject({
      knowledge: [
        {
          character: "Dr. Henry Pryce",
          fact: "The same blade killed all three men.",
        },
      ],
    })
    expect(
      byRule(ruleQuestions(scene(), 0, "The fog lifted."), "knowledge").map(
        (q) => asked(q.question)
      )
    ).toEqual([expect.stringMatching(/^Leaving aside/)])
  })

  it("asks the Outcome question only after the Opening, and Agency against the input or against arriving", () => {
    const opening = ruleQuestions(scene(), 0, DRAFT)
    const turn = ruleQuestions(scene({ turn: questionNell }), 0, DRAFT)
    expect(byRule(opening, "outcome")).toEqual([])
    expect(byRule(turn, "outcome")).toHaveLength(1)
    expect(asked(byRule(opening, "agency")[0].question)).toMatch(/arriv/)
    expect(asked(byRule(turn, "agency")[0].question)).toMatch(/`player_input`/)
    for (const rule of ["unplanned_clue", "agency"] as const)
      expect(byRule(turn, rule)).toHaveLength(1)
  })

  it("Period only when the Brief has a setting; Voice once per guideline only when it has Voice", () => {
    const withAll = ruleQuestions(scene(), 0, DRAFT)
    expect(byRule(withAll, "period")).toHaveLength(1)
    expect(byRule(withAll, "voice").map((q) => q.label)).toEqual([
      'Does the Draft break "Close third person on Jacob."?',
      'Does the Draft break "Short sentences."?',
      'Does the Draft break "Fog, not gore: the killings are never shown on the page."?',
    ])

    const bare = { ...londonBrief("p").brief, settings: [], voices: [] }
    const without = ruleQuestions(scene({ brief: bare }), 0, DRAFT)
    expect(byRule(without, "period")).toEqual([])
    expect(byRule(without, "voice")).toEqual([])
  })

  it("Codex: one question per Entry the Draft names, and one for removed names", () => {
    const codex = byRule(
      ruleQuestions(scene(), 0, "Nell smiled at Jacob."),
      "codex"
    )
    expect(codex.map((q) => q.label)).toEqual([
      "Does the Draft conflict with Jacob Flannery?",
      "Does the Draft conflict with Nell Garvey?",
      "Does the Draft mention a removed Entry?",
    ])
    const allLive = londonCodex().filter((e) => e.status !== "rejected")
    expect(
      byRule(
        ruleQuestions(scene({ entries: allLive }), 0, "Nell smiled."),
        "codex"
      ).map((q) => q.label)
    ).toEqual(["Does the Draft conflict with Nell Garvey?"])
  })

  it("Reputation: one Pushover question in every Band", () => {
    for (const reputation of [10, 50, 80]) {
      const questions = byRule(
        ruleQuestions(scene({ state: { reputation } }), 0, DRAFT),
        "reputation"
      )
      expect(questions.map((q) => asked(q.question))).toEqual([
        "Does a character in `drafts[0]` agree with, give in to, or flatter `player_character` against their own wants, with no reason in the story?",
      ])
      expect(questions[0].feedback).toMatch(/gives in .* without a reason/)
    }
  })

  it("Ending only on a Turn that decided one", () => {
    expect(byRule(ruleQuestions(scene(), 0, DRAFT), "ending")).toEqual([])
    const won = scene({
      turn: {
        input: "I arrest Max Rober.",
        intent: { kind: "decisive", verb: "arrest" },
        target: { kind: "entry", id: "mk-max" },
      },
      state: { cluesFound: ["mk-c1", "mk-c2", "mk-c3"] },
    })
    expect(byRule(ruleQuestions(won, 0, DRAFT), "ending")).toHaveLength(1)
  })

  it("never words a Rule for one genre", () => {
    const text = JSON.stringify(
      ruleQuestions(scene({ turn: questionNell }), 0, DRAFT).map((q) => [
        q.label,
        q.question.criteria,
        typeof q.question.instructions === "string"
          ? q.question.instructions
          : (q.question.instructions as { question: string }).question,
        q.feedback,
      ])
    )
    expect(text).not.toMatch(/suspect|evidence|crime|murder|detective|arrest/i)
  })
})

describe("the Judge state (spec §10.2)", () => {
  it("holds the Drafts, the scene and the Hidden truth, and nothing removed", () => {
    const state = judgeState(scene({ turn: questionNell }), ["A", "B"])
    expect(state.drafts).toEqual(["A", "B"])
    expect(state.player_input).toBe(questionNell.input)
    expect(state.allowed_reveals).toEqual([
      {
        character: "Nell Garvey",
        fact: "She saw a young clerk leave Carrow's warehouse at dawn.",
      },
    ])
    expect(JSON.stringify(state.hidden_truth)).toMatch(/Revenge/)
    expect(state.rejected_names).toEqual([
      "Tower Bridge",
      "Inspector Frederick Abberline",
    ])
    expect(JSON.stringify(state.codex)).not.toMatch(/Abberline/)
    expect(state.known_places).not.toContain("Tower Bridge")
  })
})

describe("Discovery questions", () => {
  it("asks, per Draft, whether it revealed each Allowed reveal and each Discoverable Clue", () => {
    const questions = discoveryQuestions(scene({ turn: questionNell }), 1)
    expect(questions.map((q) => q.target)).toEqual([
      { kind: "knowledge", entryId: "mk-k-nell" },
    ])
    expect(asked(questions[0].question)).toMatch(/`drafts\[1\]`/)

    const examine = scene({
      turn: {
        input: "I search the straw.",
        intent: { kind: "examine" },
        target: { kind: "none" },
      },
      state: { locationId: "mk-spitalfields" },
    })
    expect(discoveryQuestions(examine, 0).map((q) => q.target)).toEqual([
      { kind: "clue", entryId: "mk-c4" },
    ])
    expect(discoveryQuestions(scene(), 0)).toEqual([])
  })
})

describe("reading a Draft's answers", () => {
  const questions = ruleQuestions(scene({ turn: questionNell }), 0, DRAFT)
  const agency = questions.findIndex((q) => q.rule === "agency")
  const period = questions.findIndex((q) => q.rule === "period")

  it("fails a Draft on any answer at p >= 0.5 and marks answers from 0.35 to 0.65 Unsure", () => {
    const answers = questions.map((_, i) =>
      i === agency ? 0.82 : i === period ? 0.4 : 0.05
    )
    const draft = readDraft(questions, answers)
    expect(draft.passed).toBe(false)
    expect(draft.highestViolation).toBe(0.82)
    expect(draft.rules[agency]).toMatchObject({
      rule: "agency",
      failed: true,
      unsure: false,
    })
    expect(draft.rules[period]).toMatchObject({ failed: false, unsure: true })
    expect(
      readDraft(
        questions,
        questions.map(() => 0.1)
      ).passed
    ).toBe(true)
  })

  it("turns only failures at p >= 0.8 into Retry feedback, one line per question", () => {
    const failing = readDraft(
      questions,
      questions.map((_, i) => (i === agency ? 0.82 : i === period ? 0.7 : 0.05))
    )
    const alsoFailing = readDraft(
      questions,
      questions.map((_, i) => (i === agency ? 0.9 : 0.05))
    )
    const lines = retryFeedback([
      { questions, result: failing },
      { questions, result: alsoFailing },
    ])
    expect(lines).toEqual([
      expect.stringMatching(/^Agency \(0\.90\): .*Rewrite/),
    ])
    expect(
      retryFeedback([
        {
          questions,
          result: readDraft(
            questions,
            questions.map((_, i) => (i === period ? 0.7 : 0.05))
          ),
        },
      ])
    ).toEqual([])
  })
})

describe("choosing the Draft to ship", () => {
  const draft = (id: string, passed: boolean, highestViolation: number) => ({
    id,
    passed,
    highestViolation,
  })

  it("ships the passing Draft with the lower highest violation", () => {
    expect(
      chooseShipped([[draft("a", true, 0.3), draft("b", true, 0.2)]], 3)
    ).toEqual({ id: "b", flagged: false })
    expect(
      chooseShipped([[draft("a", true, 0.3), draft("b", false, 0.9)]], 3)
    ).toEqual({ id: "a", flagged: false })
  })

  it("writes another Round while Rounds remain and every Draft failed", () => {
    expect(
      chooseShipped([[draft("a", false, 0.6), draft("b", false, 0.9)]], 3)
    ).toBeNull()
  })

  it("after the last Round ships the least-violating Draft of any Round, flagged", () => {
    expect(
      chooseShipped(
        [
          [draft("a", false, 0.6), draft("b", false, 0.9)],
          [draft("c", false, 0.7), draft("d", false, 0.8)],
          [draft("e", false, 0.95), draft("f", false, 0.75)],
        ],
        3
      )
    ).toEqual({ id: "a", flagged: true })
  })
})
