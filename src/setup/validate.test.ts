import { describe, expect, it } from "vitest"

import type { Entry } from "@/domain/entry"
import { FakeJudge } from "@/models/fake-judge"
import { londonBrief, testTime } from "@/test/london"

import { authorEntries } from "./author-entries"
import { resolveWorldDraft } from "./resolve"
import { validateEntries } from "./validate"

function drafted() {
  const { brief } = londonBrief("p")
  let n = 0
  const context = { worldId: "w1", now: testTime(0), newId: () => `e${++n}` }
  const author = authorEntries(brief, context)
  const { entries } = resolveWorldDraft(
    {
      locations: [
        {
          name: "The Harbour",
          description: "Cranes and fog.",
          connections: ["Scotland Yard"],
        },
        {
          name: "The Market",
          description: "Stalls before dawn.",
          connections: ["The Harbour"],
        },
      ],
      npcs: [
        {
          name: "Nell Garvey",
          description: "Sells flowers.",
          role: "Witness",
          age: "24",
          personality: "Quick to laugh.",
          backstory: "Sells violets every morning.",
          aliases: [],
        },
      ],
      exit_conditions: [],
    },
    { brief, authorEntries: author, context }
  )
  return { brief, codex: [...author, ...entries], entries }
}

function byName(entries: readonly Entry[], name: string) {
  return entries.find((e) => e.name === name)!
}

describe("Judge validation of drafted Entries (spec §8 step 3)", () => {
  it("asks whether each drafted Entry conflicts with the Brief and whether it fits the setting, in one call", async () => {
    const { brief, codex, entries } = drafted()
    const judge = new FakeJudge()
    await validateEntries(judge, { brief, entries, codex })

    expect(judge.calls).toHaveLength(1)
    const { request } = judge.calls[0]
    expect(Object.keys(request.questions)).toHaveLength(entries.length * 2)
    expect(JSON.stringify(request.state)).toContain("Autumn 1888")
    // The Entry sits beside its question, with references as names, not ids.
    const harbour = Object.values(request.questions).find((q) =>
      JSON.stringify(q.instructions).includes("The Harbour")
    )
    expect(JSON.stringify(harbour?.instructions)).toContain("Scotland Yard")
    expect(JSON.stringify(request.questions)).not.toMatch(/"e\d+"/)
  })

  it("flags a failed answer and an Unsure one, and returns every Entry it was given", async () => {
    const { brief, codex, entries } = drafted()
    const judge = new FakeJudge({
      answer: (id, question) => {
        const about = JSON.stringify(question.instructions)
        if (id.startsWith("contradiction") && about.includes("The Market"))
          return 0.82
        if (id.startsWith("setting") && about.includes("Nell Garvey"))
          return 0.41
        return 0.1
      },
    })
    const { entries: checked } = await validateEntries(judge, {
      brief,
      entries,
      codex,
    })

    expect(checked.map((e) => e.id)).toEqual(entries.map((e) => e.id))
    expect(byName(checked, "The Market").jevFlags).toEqual([
      {
        question: "contradiction",
        prompt: "Does The Market conflict with the Brief?",
        probability: 0.82,
        verdict: "fail",
      },
    ])
    expect(byName(checked, "Nell Garvey").jevFlags).toEqual([
      {
        question: "period_fit",
        prompt: "Is Nell Garvey out of place in the setting?",
        probability: 0.41,
        verdict: "flagged",
      },
    ])
    expect(byName(checked, "The Harbour").jevFlags).toEqual([])
  })

  it("skips the setting question when the Brief has no setting, and makes no call for no Entries", async () => {
    const { brief, codex, entries } = drafted()
    const judge = new FakeJudge()
    await validateEntries(judge, {
      brief: { ...brief, settings: [] },
      entries,
      codex,
    })
    expect(Object.keys(judge.calls[0].request.questions)).toHaveLength(
      entries.length
    )

    await validateEntries(judge, { brief, entries: [], codex })
    expect(judge.calls).toHaveLength(1)
  })
})
