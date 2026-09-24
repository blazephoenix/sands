import { describe, expect, it } from "vitest"

import type { Entry } from "@/domain/entry"
import type { Classification } from "@/domain/session"
import type { ChoiceAnswer } from "@/models/judge"
import { londonBrief, londonEntries } from "@/test/london"

import { startingState } from "./initial-state"
import { readingQuestions, readReading } from "./reading"

const codex = () => londonEntries("w", "mk", "ready")
const brief = londonBrief("p").brief

function built(entries: Entry[] = codex()) {
  return readingQuestions({
    brief,
    entries,
    state: startingState("mk-yard"),
    playerInput: "I ask Nell what she saw.",
    lastPassage: "Fog.",
  })
}

function answer<O extends string>(
  choice: NoInfer<O>,
  probability: number,
  confidence = probability
): ChoiceAnswer<O> {
  return {
    type: "choice",
    choice,
    probabilities: { [choice]: probability } as Record<O, number>,
    confidence,
  }
}

describe("the Reading's questions (spec §9.1 step 2)", () => {
  it("offers move, examine, question, one option per Decisive action verb, and other", () => {
    const { questions } = built()
    expect(Object.keys(questions.intent.criteria)).toEqual([
      "move",
      "examine",
      "question",
      "arrest",
      "other",
    ])
  })

  it("offers every live targetable Entry by name, plus none and not_in_codex", () => {
    const options = Object.keys(built().questions.target.criteria)
    expect(options).toContain("Nell Garvey")
    expect(options).toContain("Rober & Sons ledger")
    expect(options).toContain("Spitalfields Market")
    expect(options).not.toContain("Tower Bridge")
    expect(options).not.toContain("Jacob Flannery")
    expect(options.slice(-2)).toEqual(["none", "not_in_codex"])
  })

  it("keeps two Entries with the same name apart", () => {
    const entries = codex()
    const nell = entries.find((e) => e.id === "mk-nell")!
    const { questions, targets } = built([
      ...entries,
      { ...nell, id: "mk-nell-2" },
    ])
    const options = Object.keys(questions.target.criteria)
    expect(options).toContain("Nell Garvey (2)")
    expect(targets.get("Nell Garvey (2)")).toBe("mk-nell-2")
  })

  it("offers the four Classifications", () => {
    expect(Object.keys(built().questions.classification.criteria)).toEqual([
      "on_script",
      "tangential",
      "off_script",
      "reckless",
    ])
  })
})

describe("reading the answers", () => {
  const { targets } = built()

  it("maps the chosen options to an intent, a target and a Classification", () => {
    const reading = readReading(
      {
        intent: answer<string>("arrest", 0.9),
        target: answer<string>("Nell Garvey", 0.8),
        classification: answer<Classification>("on_script", 0.85, 0.7),
      },
      targets
    )
    expect(reading.intent).toEqual({ kind: "decisive", verb: "arrest" })
    expect(reading.target).toEqual({ kind: "entry", id: "mk-nell" })
    expect(reading.classification).toBe("on_script")
    expect(reading.log).toEqual({
      intent: { value: "arrest", probability: 0.9 },
      target: { value: "mk-nell", label: "Nell Garvey", probability: 0.8 },
      classification: {
        value: "on_script",
        probability: 0.85,
        belowFloor: false,
      },
    })
  })

  it("treats a Classification below the confidence floor as tangential", () => {
    const reading = readReading(
      {
        intent: answer<string>("move", 0.9),
        target: answer<string>("none", 0.9),
        classification: answer<Classification>("reckless", 0.5, 0.59),
      },
      targets
    )
    expect(reading.classification).toBe("tangential")
    expect(reading.log.classification).toMatchObject({
      value: "reckless",
      belowFloor: true,
    })
    expect(reading.target).toEqual({ kind: "none" })
  })
})
