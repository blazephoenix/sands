import { describe, expect, it } from "vitest"

import { codexSlice } from "@/codex/slice"
import { londonBrief, londonEntries } from "@/test/london"

import { buildDirective, renderDirective } from "./direct"
import { startingState } from "./initial-state"
import { writerRequest, WRITER_HIDDEN_MARKER } from "./writer-prompt"

const brief = londonBrief("p").brief
const entries = londonEntries("w", "mk", "ready")
const state = { ...startingState("mk-yard"), locationId: "mk-docks" }
const directive = buildDirective({
  brief,
  entries,
  state,
  resolution: null,
  metExitConditionIds: [],
})
const slice = codexSlice({
  entries,
  state,
  texts: ["The clerk bowed."],
  targetId: null,
  allowedReveals: [],
  discoverableClues: [],
})

function request(feedback: string[] = []) {
  return writerRequest({
    brief,
    entries,
    directive,
    slice,
    recentPassages: ["P1", "P2", "P3", "P4", "P5"],
    playerInput: "I bow back.",
    feedback,
  })
}

describe("the Writer's request (spec §9.1 step 5)", () => {
  it("gives the Brief and the Codex slice with every Hidden value marked secret", () => {
    const { prompt } = request()
    expect(prompt).toContain(`${WRITER_HIDDEN_MARKER} Revenge`)
    expect(prompt).toMatch(/Max Rober/)
    expect(prompt).not.toMatch(/Tower Bridge|Abberline/)
  })

  it("gives the last four Passages, the Player's input and the Directive", () => {
    const { prompt } = request()
    expect(prompt).not.toContain("P1")
    expect(prompt).toMatch(/P2[\s\S]*P5/)
    expect(prompt).toContain("I bow back.")
    expect(prompt).toContain(renderDirective(directive))
  })

  it("adds Retry feedback only when there is some", () => {
    expect(request().prompt).not.toMatch(/Fix these/)
    expect(request(["Agency (0.82): rewrite."]).prompt).toMatch(
      /Fix these[\s\S]*Agency \(0\.82\): rewrite\./
    )
  })

  it("tells the Writer the rules the Judge holds it to", () => {
    const { instructions } = request()
    expect(instructions).toMatch(/about 150 words/)
    expect(instructions).toMatch(/only what the Player's input says/)
    expect(instructions).toMatch(/no new fact about any character/i)
    expect(instructions).toContain(WRITER_HIDDEN_MARKER)
  })
})
