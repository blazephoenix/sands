import { describe, expect, it } from "vitest"

import type { SetupEvent } from "@/domain/events"
import type { Db } from "@/db/client"
import { listWorldEntries } from "@/db/entries"
import { StoreError } from "@/db/errors"
import { getWorld } from "@/db/worlds"
import { DrafterError } from "@/models/drafter"
import { FakeDrafter } from "@/models/fake-drafter"
import { FakeJudge } from "@/models/fake-judge"
import { testDb } from "@/test/db"
import { londonBrief, londonBriefDocument } from "@/test/london"
import {
  londonStoryDraft,
  londonWorldDraft,
  withAction,
} from "@/test/setup-drafts"
import { createWorld } from "@/worlds/worlds"

import {
  claimSetup,
  parseSummary,
  runSetup,
  setupConflict,
  type SetupModels,
} from "./run"

describe("setup run rules", () => {
  it("lets only a draft World run setup", () => {
    expect(setupConflict({ setupStatus: "draft" })).toBeNull()
    expect(setupConflict({ setupStatus: "drafting" })).toMatch(
      /already running/
    )
    expect(setupConflict({ setupStatus: "review" })).toMatch(/already run/)
    expect(setupConflict({ setupStatus: "ready" })).toMatch(/already run/)
  })

  it("describes the parsed Brief from the Brief itself", () => {
    expect(parseSummary(londonBrief("p").brief)).toBe(
      "7 Characters, 1 Location, 3 Arcs, 1 Ending"
    )
  })
})

const silent = () => {}

function draftWorld(db: Db, briefDoc: unknown[] = londonBriefDocument("p")) {
  return createWorld(db, { name: "Test World", briefDoc })
}

/** The London Brief document without its Location section. */
function withoutLocations() {
  let inLocation = false
  return londonBriefDocument("p").filter((block) => {
    if (block.type === "location") inLocation = true
    else if (block.type !== "paragraph") inLocation = false
    return !inLocation
  })
}

/** Claims and runs setup on a new London World, collecting the events. */
async function setUp(
  models: Partial<SetupModels> & { drafter: SetupModels["drafter"] },
  options: { signal?: AbortSignal; db?: Db; briefDoc?: unknown[] } = {}
) {
  const db = options.db ?? testDb()
  const world = claimSetup(db, draftWorld(db, options.briefDoc).id)
  const events: SetupEvent[] = []
  await runSetup(
    { db, drafter: models.drafter, judge: models.judge ?? new FakeJudge() },
    world,
    {
      emit: (event) => events.push(event),
      elapsed: () => 0,
      signal: options.signal ?? new AbortController().signal,
    },
    { log: silent }
  )
  return { db, world, events, last: events.at(-1)! }
}

function drafter(story: unknown | unknown[] = londonStoryDraft) {
  return new FakeDrafter({
    outputs: { world_call: londonWorldDraft, story_logic_call: story },
  })
}

function steps(events: SetupEvent[]) {
  return events.flatMap((e) =>
    e.type === "step"
      ? [`${e.step} ${e.status} ${e.attempt}/${e.maxAttempts}`]
      : []
  )
}

describe("claiming a World for setup", () => {
  it("moves a draft World to drafting, which locks its Brief", () => {
    const db = testDb()
    const world = claimSetup(db, draftWorld(db).id)
    expect(world.setupStatus).toBe("drafting")
    expect(getWorld(db, world.id).setupStatus).toBe("drafting")
  })

  it("refuses a World that is already drafting, and one whose Brief does not pass", () => {
    const db = testDb()
    const world = claimSetup(db, draftWorld(db).id)
    expect(() => claimSetup(db, world.id)).toThrow(/already running/)
    const empty = createWorld(db, { name: "Empty", briefDoc: [] })
    expect(() => claimSetup(db, empty.id)).toThrow(StoreError)
    expect(() => claimSetup(db, empty.id)).toThrow(/Brief/)
  })
})

describe("a setup run (spec §8)", () => {
  it("ends in review, with the Brief's locked author Entries and the drafted proposed Entries stored", async () => {
    const { db, world, events, last } = await setUp({ drafter: drafter() })

    expect(steps(events)).toEqual([
      "parse started 1/1",
      "parse done 1/1",
      "world_call started 1/1",
      "world_call done 1/1",
      "story_logic_call started 1/3",
      "story_logic_call done 1/3",
      "validate started 1/3",
      "validate done 1/3",
      "solvability started 1/3",
      "solvability done 1/3",
    ])
    expect(last.type).toBe("result")
    if (last.type !== "result") return
    expect(last.world.setupStatus).toBe("review")
    expect(last.world.solvability).toMatchObject({ passed: true, gaps: [] })
    expect(getWorld(db, world.id)).toEqual(last.world)

    const stored = listWorldEntries(db, world.id)
    expect(stored).toEqual(last.entries)
    const author = stored.filter((e) => e.source === "author")
    expect(author.map((e) => e.name)).toContain("Jacob Flannery")
    expect(author.every((e) => e.status === "locked")).toBe(true)
    const drafted = stored.filter((e) => e.source === "setup")
    expect(drafted.every((e) => e.status === "proposed")).toBe(true)
    expect(drafted.map((e) => e.name)).toEqual([
      "The Harbour",
      "The Market",
      "Nell Garvey",
      "Victims' trade learned",
      "Killer caught",
      "C1 — A torn ledger page",
      "C2 — The young clerk at dawn",
      "Nell saw the clerk",
      "Arrest Max Rober",
    ])
  })

  it("gives the Story logic call the World call's output", async () => {
    const fake = drafter()
    await setUp({ drafter: fake })
    const [story] = fake.callsTo("story_logic_call")
    expect(story.request.prompt).toContain("The Harbour")
    expect(story.request.prompt).toContain("Nell Garvey")
  })

  it("stores the Judge's flags on the Entries it flagged", async () => {
    const judge = new FakeJudge({
      answer: (id, question) =>
        id.startsWith("contradiction") &&
        JSON.stringify(question.instructions).includes("The Market")
          ? 0.9
          : undefined,
    })
    const { db, world } = await setUp({ drafter: drafter(), judge })
    const market = listWorldEntries(db, world.id).find(
      (e) => e.name === "The Market"
    )
    expect(market?.jevFlags).toMatchObject([
      { question: "contradiction", probability: 0.9, verdict: "fail" },
    ])
  })

  it("counts failed answers as Judge flags and Unsure ones apart, as the review's badges do", async () => {
    // The Entry asked about, not one that only mentions it.
    const about = (name: string, question: { instructions?: unknown }) =>
      JSON.stringify(question.instructions).includes(`"name":"${name}"`)
    const judge = new FakeJudge({
      answer: (id, question) =>
        !id.startsWith("contradiction")
          ? undefined
          : about("The Market", question)
            ? 0.9
            : about("The Harbour", question)
              ? 0.45
              : undefined,
    })
    const { events } = await setUp({ drafter: drafter(), judge })
    const validated = events.find(
      (e) => e.type === "step" && e.step === "validate" && e.status === "done"
    )
    expect(validated).toMatchObject({
      detail: "1 Entry with a Judge flag, 1 Entry the Judge is unsure about",
    })
  })
})

describe("the Solvability retry loop (spec §8 step 3)", () => {
  const redHerring = {
    ...londonStoryDraft,
    clues: [
      { ...londonStoryDraft.clues[0], red_herring: true },
      londonStoryDraft.clues[1],
    ],
  }

  it("re-runs the Story logic call with the Gaps as feedback, and stores the draft that passes", async () => {
    const fake = drafter([redHerring, londonStoryDraft])
    const { events, last } = await setUp({ drafter: fake })

    expect(steps(events).slice(6)).toEqual([
      "validate started 1/3",
      "validate done 1/3",
      "solvability started 1/3",
      "solvability failed 1/3",
      "story_logic_call started 2/3",
      "story_logic_call done 2/3",
      "validate started 2/3",
      "validate done 2/3",
      "solvability started 2/3",
      "solvability done 2/3",
    ])
    const gaps = events.find((e) => e.type === "gaps")
    expect(gaps).toMatchObject({
      attempt: 1,
      gaps: [{ code: "red_herring_required" }],
    })
    const retry = events.find(
      (e) =>
        e.type === "step" && e.step === "story_logic_call" && e.attempt === 2
    )
    expect(retry).toMatchObject({ detail: "fixing 1 gap" })

    const [first, second] = fake.callsTo("story_logic_call")
    expect(first.request.prompt).not.toContain("previous draft")
    expect(second.request.prompt).toContain(
      "Arrest Max Rober requires C1, which is a red herring."
    )
    expect(second.request.prompt).toContain("previous_draft")
    expect(last).toMatchObject({
      type: "result",
      world: { setupStatus: "review" },
    })
  })

  it("spends a retry on a Clue at a Location the World call left unreachable, since the Story logic call can move it", async () => {
    const island = {
      ...londonWorldDraft,
      locations: [
        ...londonWorldDraft.locations,
        {
          name: "The Island",
          description: "No boat goes there.",
          connections: [],
        },
      ],
    }
    const stranded = {
      ...londonStoryDraft,
      clues: [
        { ...londonStoryDraft.clues[0], location: "The Island" },
        londonStoryDraft.clues[1],
      ],
    }
    const fake = new FakeDrafter({
      outputs: {
        world_call: island,
        story_logic_call: [stranded, londonStoryDraft],
      },
    })
    const { events, last } = await setUp({ drafter: fake })

    expect(events.find((e) => e.type === "gaps")).toMatchObject({
      gaps: [{ code: "unreachable_clue" }],
    })
    expect(fake.callsTo("world_call")).toHaveLength(1)
    expect(fake.callsTo("story_logic_call")).toHaveLength(2)
    expect(last).toMatchObject({ type: "result" })
  })

  it("fails at once, spending no Story logic call, when the World call leaves no start Location", async () => {
    const fake = new FakeDrafter({
      outputs: {
        world_call: { ...londonWorldDraft, locations: [] },
        story_logic_call: londonStoryDraft,
      },
    })
    const { db, world, events, last } = await setUp(
      { drafter: fake },
      { briefDoc: withoutLocations() }
    )

    expect(fake.callsTo("world_call")).toHaveLength(1)
    expect(fake.callsTo("story_logic_call")).toHaveLength(0)
    expect(steps(events).at(-1)).toBe("world_call failed 1/1")
    expect(last).toMatchObject({
      type: "error",
      code: "solvability_failed",
      step: "world_call",
      gaps: [
        {
          code: "no_start_location",
          message: expect.stringMatching(/Add a Location to the Brief/),
        },
      ],
    })
    if (last.type !== "error") return
    expect(last.message).toMatch(/Add a Location to the Brief/)
    expect(getWorld(db, world.id).setupStatus).toBe("draft")
    expect(listWorldEntries(db, world.id)).toEqual([])
  })

  it("feeds a name that matches no Entry back as a Gap, and never stores it", async () => {
    const strangerKnows = {
      ...londonStoryDraft,
      knowledge: [
        ...londonStoryDraft.knowledge,
        {
          ...londonStoryDraft.knowledge[0],
          name: "Tom's tale",
          character: "Old Tom",
        },
      ],
    }
    const fake = drafter([strangerKnows, londonStoryDraft])
    const { db, world, events } = await setUp({ drafter: fake })

    expect(events.find((e) => e.type === "gaps")).toMatchObject({
      gaps: [{ code: "unknown_name", entryId: null }],
    })
    expect(fake.callsTo("story_logic_call")[1].request.prompt).toContain(
      '"Old Tom", but no character has that name'
    )
    expect(JSON.stringify(listWorldEntries(db, world.id))).not.toContain(
      "Old Tom"
    )
  })

  it("stops after two retries, lists the last Gaps, and leaves the World in draft with nothing stored", async () => {
    const fake = drafter([redHerring, redHerring, redHerring])
    const { db, world, events, last } = await setUp({ drafter: fake })

    expect(fake.callsTo("story_logic_call")).toHaveLength(3)
    expect(events.filter((e) => e.type === "gaps")).toHaveLength(3)
    expect(last).toMatchObject({
      type: "error",
      code: "solvability_failed",
      step: "solvability",
      gaps: [{ code: "red_herring_required" }],
    })
    expect(getWorld(db, world.id).setupStatus).toBe("draft")
    expect(listWorldEntries(db, world.id)).toEqual([])
  })

  it("says the Drafter kept naming what the World does not have when unknown names are the only Gaps left", async () => {
    const stranger = {
      ...londonStoryDraft,
      knowledge: [
        ...londonStoryDraft.knowledge,
        {
          ...londonStoryDraft.knowledge[0],
          name: "Tom's tale",
          character: "Old Tom",
        },
      ],
    }
    const { db, world, last } = await setUp({
      drafter: drafter([stranger, stranger, stranger]),
    })
    expect(last).toMatchObject({
      type: "error",
      code: "solvability_failed",
      gaps: [{ code: "unknown_name" }],
    })
    if (last.type !== "error") return
    expect(last.message).toMatch(/names that are not in this World/)
    expect(last.message).not.toMatch(/not solvable/)
    expect(getWorld(db, world.id).setupStatus).toBe("draft")
  })

  it("shows the Gap 'nothing in this World wins the story' when no Decisive action wins", async () => {
    const noWin = withAction({ on_success: "none" })
    const fake = drafter([noWin, noWin, noWin])
    const { db, world, last } = await setUp({ drafter: fake })

    expect(fake.callsTo("story_logic_call")[1].request.prompt).toContain(
      "Nothing in this World wins the story."
    )
    expect(last).toMatchObject({
      type: "error",
      code: "solvability_failed",
      gaps: [
        {
          code: "no_winning_action",
          message: expect.stringMatching(
            /^Nothing in this World wins the story\./
          ),
        },
      ],
    })
    expect(getWorld(db, world.id).setupStatus).toBe("draft")
  })
})

describe("a failed or abandoned setup returns the World to draft (spec §13)", () => {
  async function expectDraftWithNothingStored(
    run: Awaited<ReturnType<typeof setUp>>
  ) {
    expect(getWorld(run.db, run.world.id).setupStatus).toBe("draft")
    expect(listWorldEntries(run.db, run.world.id)).toEqual([])
  }

  it("on a Drafter failure, with the error shown at the step that failed", async () => {
    const fake = new FakeDrafter({
      outputs: { world_call: new DrafterError("The model timed out.") },
    })
    const run = await setUp({ drafter: fake })
    expect(steps(run.events).at(-1)).toBe("world_call failed 1/1")
    expect(run.last).toMatchObject({
      type: "error",
      code: "drafter_error",
      step: "world_call",
      message: expect.stringContaining("The model timed out."),
    })
    await expectDraftWithNothingStored(run)
  })

  it("on a Judge failure", async () => {
    const judge = new FakeJudge({
      answer: () => {
        throw new Error("Jev is unavailable.")
      },
    })
    const run = await setUp({ drafter: drafter(), judge })
    expect(run.last).toMatchObject({
      type: "error",
      code: "judge_outage",
      step: "validate",
      message: expect.stringContaining("Jev is unavailable."),
    })
    await expectDraftWithNothingStored(run)
  })

  it("when the Author leaves mid-setup", async () => {
    const leave = new AbortController()
    const fake = new FakeDrafter({
      outputs: {
        world_call: londonWorldDraft,
        story_logic_call: londonStoryDraft,
      },
    })
    const draft = fake.draft.bind(fake)
    fake.draft = async (request, options) => {
      if (request.call === "story_logic_call") leave.abort()
      return draft(request, options)
    }
    const run = await setUp({ drafter: fake }, { signal: leave.signal })
    expect(run.events.some((e) => e.type === "result")).toBe(false)
    await expectDraftWithNothingStored(run)
  })
})
