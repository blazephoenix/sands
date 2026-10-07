import { describe, expect, it } from "vitest"

import { codexSlice } from "@/codex/slice"
import { londonBrief, londonEntries } from "@/test/london"

import { ENGINE_CONFIG } from "./config"

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
  playerInput: null,
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

  it("casts the Writer as a novelist playing everyone but the Player character", () => {
    const { instructions } = request()
    expect(instructions).toMatch(
      /^You are a talented novelist writing an ongoing interactive story\. A Player plays Jacob Flannery\. You write everyone and everything else\./
    )
    expect(instructions).not.toMatch(/\{player\}|\{words\}/)
  })

  it("caps the Passage at the configured length", () => {
    expect(request().instructions).toContain(
      `Keep each Passage under ${ENGINE_CONFIG.passageWords} words.`
    )
  })

  it("gives characters their own wants and the right to refuse", () => {
    const { instructions } = request()
    expect(instructions).toMatch(
      /No character is Jacob Flannery's servant or cheerleader\./
    )
    expect(instructions).toMatch(/They may refuse, bargain, stall/)
    expect(instructions).toMatch(/## Before writing each Passage/)
  })

  it("restates Sands' constraints as things the Writer builds on", () => {
    const { instructions } = request()
    expect(instructions).toMatch(/The Brief and the Codex are true\./)
    expect(instructions).toMatch(
      /Values marked "SECRET" are the Hidden truth\./
    )
    expect(instructions).toMatch(/Show what the Directive says happened\./)
    expect(instructions).toMatch(
      /Never write Jacob Flannery's actions, dialogue, or thoughts beyond what the Player's input says\./
    )
    expect(instructions).toMatch(/blank lines/)
    expect(instructions).not.toMatch(/new fact/i)
    expect(WRITER_HIDDEN_MARKER).toMatch(/^SECRET\b/)
  })
})
