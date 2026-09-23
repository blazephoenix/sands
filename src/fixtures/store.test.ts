import { beforeEach, describe, expect, it } from "vitest"

import { listSessionEntries, patchEntry } from "./entries"
import { SCENARIO_IDS, SCENARIOS, parseScenarios } from "./scenarios"
import { SESSION_IDS, createSession, listTurns } from "./sessions"
import { FixtureError, StoreError, buildFixtureState, resetStore, seedFixtures } from "./store"
import { WORLD_IDS, getWorld, listWorldEntries, listWorlds } from "./worlds"

beforeEach(() => {
  resetStore()
})

describe("fixture store", () => {
  it("loads the 1888 London case through the schemas", () => {
    const worlds = listWorlds()
    expect(new Set(worlds.map((w) => w.setupStatus))).toEqual(new Set(["draft", "drafting", "review", "ready"]))
    expect(getWorld(WORLD_IDS.ready).brief?.characters.find((c) => c.isPlayer)?.name).toBe("Jacob Flannery")
  })

  it("holds Entries from every source and in every status, with Jev flags and rejections", () => {
    const all = [...listWorldEntries(WORLD_IDS.ready), ...listWorldEntries(WORLD_IDS.review), ...listSessionEntries(SESSION_IDS.midPlay)]
    expect(new Set(all.map((e) => e.source))).toEqual(new Set(["author", "setup", "play"]))
    expect(new Set(all.map((e) => e.status))).toEqual(new Set(["locked", "proposed", "accepted", "edited", "rejected"]))
    expect(all.some((e) => e.jevFlags.length > 0)).toBe(true)
    expect(all.filter((e) => e.status === "rejected").length).toBeGreaterThan(0)
  })

  it("has a mid-play Session with a second Round, a flagged Turn and pending background work", () => {
    const turns = listTurns(SESSION_IDS.midPlay)
    expect(turns).toHaveLength(6)
    expect(turns.some((t) => t.log.rounds.length === 2 && t.log.rounds[0].drafts.every((d) => !d.passed))).toBe(true)
    expect(turns.some((t) => t.flagged && t.log.rounds.length === 3)).toBe(true)
    expect(turns.at(-1)?.backgroundStatus).toBe("pending")
  })

  it("has one finished Session per Ending", () => {
    const endings = [
      [SESSION_IDS.win, "win"],
      [SESSION_IDS.death, "death"],
      [SESSION_IDS.removed, "removed"],
    ] as const
    for (const [sessionId, ending] of endings) {
      expect(listTurns(sessionId).at(-1)?.state.ending).toBe(ending)
    }
  })

  it("fails loudly when a fixture drifts from the contracts", () => {
    const seed = seedFixtures()
    const broken = { ...seed, entries: seed.entries.map((e, i) => (i === 0 ? { ...(e as object), status: "maybe" } : e)) }
    expect(() => buildFixtureState(broken)).toThrow(FixtureError)
    expect(() => buildFixtureState(broken)).toThrow(/status/)
  })

  it("fails loudly on a dangling reference", () => {
    const seed = seedFixtures()
    const clue = seed.entries.find((e) => (e as { kind: string }).kind === "clue") as { data: object }
    const broken = {
      ...seed,
      entries: seed.entries.map((e) => (e === clue ? { ...clue, data: { ...clue.data, knownBy: ["nobody"] } } : e)),
    }
    expect(() => buildFixtureState(broken)).toThrow(/unknown Entry nobody/)
  })
})

describe("Entry operations", () => {
  it("accepts, rejects and restores; locked Entries refuse", () => {
    const [proposed] = listWorldEntries(WORLD_IDS.review).filter((e) => e.status === "proposed")
    expect(patchEntry(proposed.id, { action: "accept" }).entry.status).toBe("accepted")
    expect(patchEntry(proposed.id, { action: "reject" }).entry.status).toBe("rejected")
    expect(patchEntry(proposed.id, { action: "restore", status: "proposed" }).entry.status).toBe("proposed")
    const locked = listWorldEntries(WORLD_IDS.review).find((e) => e.status === "locked")!
    expect(() => patchEntry(locked.id, { action: "reject" })).toThrow(StoreError)
  })

  it("edits content and marks the Entry edited", () => {
    const entry = listWorldEntries(WORLD_IDS.review).find((e) => e.kind === "faction")!
    const { entry: edited } = patchEntry(entry.id, {
      action: "edit",
      content: { kind: "faction", name: "The Traders", description: "Changed.", keyFacts: [], data: {} },
    })
    expect(edited).toMatchObject({ name: "The Traders", status: "edited" })
  })
})

describe("starting a Session (ADR-0005)", () => {
  it("copies every non-rejected World Entry, and later World edits do not reach the copy", () => {
    const worldEntries = listWorldEntries(WORLD_IDS.ready)
    const { session, entries } = createSession({ worldId: WORLD_IDS.ready, mode: "harness" })
    expect(entries).toHaveLength(worldEntries.filter((e) => e.status !== "rejected").length)
    expect(entries.every((e) => e.sessionId === session.id && e.templateId)).toBe(true)

    const faction = worldEntries.find((e) => e.kind === "faction")!
    patchEntry(faction.id, { action: "edit", content: { kind: "faction", name: "Renamed", description: "", keyFacts: [], data: {} } })
    expect(listSessionEntries(session.id).find((e) => e.templateId === faction.id)?.name).toBe(faction.name)
  })

  it("refuses a World that has not finished setup", () => {
    expect(() => createSession({ worldId: WORLD_IDS.draft, mode: "harness" })).toThrow(/not finished setup/)
  })

  it("moves a World in review to ready", () => {
    createSession({ worldId: WORLD_IDS.review, mode: "harness" })
    expect(getWorld(WORLD_IDS.review).setupStatus).toBe("ready")
  })
})

describe("scenario registry", () => {
  it("lists every scenario the page tickets need", () => {
    for (const id of [
      "slow",
      "request-error",
      "empty",
      "drafter-error",
      "solvability-failure",
      "judge-outage",
      "second-round",
      "flagged-turn",
      "background-pending",
      "ending-win",
      "ending-death",
      "ending-removed",
    ]) {
      expect(SCENARIO_IDS).toContain(id)
      expect(SCENARIOS[id as keyof typeof SCENARIOS].description).not.toBe("")
    }
  })

  it("parses comma-separated scenarios and ignores unknown ones", () => {
    expect(parseScenarios("slow, second-round,nope")).toEqual(["slow", "second-round"])
    expect(parseScenarios(null)).toEqual([])
  })
})
