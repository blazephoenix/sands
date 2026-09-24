import { describe, expect, it } from "vitest"

import type { Entry, EntryOfKind } from "@/domain/entry"
import type { PlayerState } from "@/domain/session"
import { londonBrief, londonEntries } from "@/test/london"

import { buildDirective, renderDirective } from "./direct"
import { startingState } from "./initial-state"
import { resolve } from "./resolve"

const brief = londonBrief("p").brief
const codex = () => londonEntries("w", "mk", "ready")
const find = <K extends Entry["kind"]>(id: string) =>
  codex().find((e) => e.id === id) as EntryOfKind<K>

function state(change: Partial<PlayerState> = {}): PlayerState {
  return { ...startingState("mk-yard"), ...change }
}

describe("the Opening's Directive (spec §9.0)", () => {
  const directive = buildDirective({
    brief,
    entries: codex(),
    state: state(),
    resolution: null,
    metExitConditionIds: [],
  })

  it("asks for the first scene at the start Location, with the first Arc under way and nothing to reveal", () => {
    expect(directive.kind).toBe("opening")
    expect(directive.location.name).toBe("Scotland Yard")
    expect(directive.arc).toMatchObject({ number: 1, name: "Introduction" })
    expect(directive.allowedReveals).toEqual([])
    expect(directive.discoverableClues).toEqual([])
    expect(directive.outcome).toBeNull()
    expect(renderDirective(directive)).toMatch(/opening scene/i)
    expect(renderDirective(directive)).toMatch(/does nothing beyond arriving/i)
  })

  it("lists the current Arc's Exit conditions that are not met yet", () => {
    expect(directive.arc.exitConditions).toEqual([
      "Jacob has read the case file and met Captain James.",
    ])
    expect(
      buildDirective({
        brief,
        entries: codex(),
        state: state(),
        resolution: null,
        metExitConditionIds: ["mk-exit-1"],
      }).arc.exitConditions
    ).toEqual([])
  })
})

describe("a Turn's Directive (spec §9.1 step 4)", () => {
  function directiveFor(
    input: Parameters<typeof resolve>[0]["intent"],
    target: Parameters<typeof resolve>[0]["target"],
    options: {
      state?: PlayerState
      classification?: "on_script" | "off_script" | "reckless"
      deathRoll?: number
    } = {}
  ) {
    const resolution = resolve({
      state: options.state ?? state(),
      entries: codex(),
      intent: input,
      target,
      classification: options.classification ?? "on_script",
      deathRoll: options.deathRoll ?? 0.99,
    })
    return buildDirective({
      brief,
      entries: codex(),
      state: resolution.state,
      resolution,
      metExitConditionIds: [],
    })
  }

  it("gives each Allowed reveal as the exact fact to convey, and forbids new facts about any character", () => {
    const directive = directiveFor(
      { kind: "question" },
      { kind: "entry", id: "mk-nell" },
      { state: state({ locationId: "mk-spitalfields" }) }
    )
    expect(directive.allowedReveals).toEqual([
      {
        character: "Nell Garvey",
        fact: find<"knowledge">("mk-k-nell").data.fact,
      },
    ])
    const text = renderDirective(directive)
    expect(text).toContain(find<"knowledge">("mk-k-nell").data.fact)
    expect(text).toMatch(/no new fact about any character/i)
  })

  it("names the Discoverable Clues with what each reveals", () => {
    const directive = directiveFor(
      { kind: "examine" },
      { kind: "none" },
      { state: state({ locationId: "mk-spitalfields" }) }
    )
    expect(directive.discoverableClues).toEqual([
      {
        name: "C4 — A cufflink engraved J.R.",
        reveals: find<"clue">("mk-c4").data.reveals,
      },
    ])
  })

  it("carries the Outcome to narrate and the Band's behaviour", () => {
    const directive = directiveFor(
      { kind: "move" },
      { kind: "entry", id: "mk-docks" },
      { state: state({ reputation: 20 }) }
    )
    expect(directive.outcome).toMatch(/St Katharine Docks/)
    expect(directive.location.name).toBe("St Katharine Docks")
    expect(directive.band).toBe("low")
    expect(directive.bandGuidance).toMatch(/distrust/)
  })

  it("adds a warning at the second off-script action", () => {
    const warned = directiveFor(
      { kind: "other" },
      { kind: "none" },
      { classification: "off_script", state: state({ offScriptCount: 1 }) }
    )
    expect(warned.warning).toMatch(/warn/)
    expect(renderDirective(warned)).toContain(warned.warning!)
    expect(directiveFor({ kind: "other" }, { kind: "none" }).warning).toBeNull()
  })

  it("asks for the ending scene when the Outcome decided an Ending", () => {
    const won = directiveFor(
      { kind: "decisive", verb: "arrest" },
      { kind: "entry", id: "mk-max" },
      { state: state({ cluesFound: ["mk-c1", "mk-c2", "mk-c3"] }) }
    )
    expect(won.ending?.kind).toBe("win")
    expect(won.ending?.instruction).toContain(brief.ending.condition)

    const died = directiveFor(
      { kind: "other" },
      { kind: "none" },
      {
        classification: "reckless",
        deathRoll: 0,
      }
    )
    expect(died.ending?.kind).toBe("death")

    const removed = directiveFor(
      { kind: "other" },
      { kind: "none" },
      {
        classification: "off_script",
        state: state({ offScriptCount: 3 }),
      }
    )
    expect(removed.ending?.kind).toBe("removed")
    expect(renderDirective(removed)).toMatch(/final scene/i)

    expect(directiveFor({ kind: "other" }, { kind: "none" }).ending).toBeNull()
  })

  it("passes on a Pacing nudge", () => {
    const directive = buildDirective({
      brief,
      entries: codex(),
      state: state({
        pacingNudge: { active: true, reason: "No progress in three Turns." },
      }),
      resolution: null,
      metExitConditionIds: [],
    })
    expect(directive.pacingNudge).toMatch(/opportunity/)
  })
})
