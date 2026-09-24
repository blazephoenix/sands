import { describe, expect, it } from "vitest"

import { londonBrief, testTime } from "@/test/london"

import { authorEntries } from "./author-entries"

const NOW = testTime(0)

function parse(brief = londonBrief("p").brief) {
  let n = 0
  return authorEntries(brief, {
    worldId: "w1",
    now: NOW,
    newId: () => `e${++n}`,
  })
}

describe("parsing the Brief into locked author Entries (spec §8 step 1)", () => {
  it("makes every character, Location and Exit condition a locked author Entry, and nothing else", () => {
    const entries = parse()
    expect(entries.map((e) => [e.kind, e.name])).toEqual([
      ["character", "Jacob Flannery"],
      ["character", "Geoffrey James"],
      ["character", "Amanda Hopkins"],
      ["character", "Thomas Whitlock"],
      ["character", "Edmund Carrow"],
      ["character", "Silas Pembury"],
      ["character", "Max Rober"],
      ["location", "Scotland Yard"],
      ["exit_condition", "Jacob has read the case file and met Captain James."],
    ])
    for (const entry of entries) {
      expect(entry).toMatchObject({
        worldId: "w1",
        sessionId: null,
        templateId: null,
        source: "author",
        sourceTurn: null,
        status: "locked",
        jevFlags: [],
        seenAt: null,
        createdAt: NOW,
        updatedAt: NOW,
      })
    }
    expect(new Set(entries.map((e) => e.id)).size).toBe(entries.length)
  })

  it("keeps a character's fields, marks the Player character, and carries Hidden fields and custom fields", () => {
    const entries = parse()
    const jacob = entries.find((e) => e.name === "Jacob Flannery")
    expect(jacob?.data).toMatchObject({
      role: "Detective, called over from New York for a special case",
      age: "38",
      isPlayer: true,
      aliases: ["The American", "Flannery"],
      hiddenFields: [],
    })
    const max = entries.find((e) => e.name === "Max Rober")
    expect(max?.data).toMatchObject({
      isPlayer: false,
      hiddenFields: ["backstory", "Motive"],
      aliases: ["the clerk"],
    })
    expect(max?.keyFacts).toEqual([
      "Motive: Revenge against his father, a merchant.",
    ])
  })

  it("makes the Brief's first Location the start location, with no connections of its own", () => {
    const yard = parse().find((e) => e.kind === "location")
    expect(yard).toMatchObject({
      description:
        "Great Scotland Yard, Whitehall. Gaslit corridors, damp coats, a captain who wants results.",
      data: { connections: [], isStart: true },
    })
  })

  it("makes one Exit condition per line, for the Arc it belongs to", () => {
    const { brief } = londonBrief("p")
    brief.arcs[2].exitConditions = ["The killer is named.", "  ", "An arrest."]
    const exits = parse(brief).filter((e) => e.kind === "exit_condition")
    expect(exits.map((e) => e.data)).toEqual([
      {
        arcIndex: 0,
        condition: "Jacob has read the case file and met Captain James.",
      },
      { arcIndex: 2, condition: "The killer is named." },
      { arcIndex: 2, condition: "An arrest." },
    ])
    expect(exits[1].description).toBe("From Arc 3, End, in the Brief.")
  })
})
