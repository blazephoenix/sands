import { beforeEach, describe, expect, it } from "vitest"

import { setupEventSchema, type SetupEvent } from "@/domain/events"

import { MAX_STORY_LOGIC_ATTEMPTS, runScriptedSetup, type SetupRunOptions } from "./setup-script"
import { resetStore, StoreError } from "./store"
import { createWorld, getWorld, listWorldEntries, londonBriefDocument, WORLD_IDS } from "./worlds"

beforeEach(() => {
  resetStore()
})

async function play(worldId: string, options: Partial<SetupRunOptions> = {}) {
  const events: SetupEvent[] = []
  await runScriptedSetup(worldId, {
    emit: (event) => events.push(setupEventSchema.parse(event)),
    elapsed: () => events.length,
    signal: new AbortController().signal,
    timeScale: 0,
    ...options,
  })
  return events
}

function londonDraft() {
  return createWorld({ name: "London", briefDoc: londonBriefDocument("t") })
}

const steps = (events: SetupEvent[]) =>
  events.flatMap((e) => (e.type === "step" ? [`${e.step}:${e.status}:${e.attempt}`] : []))

describe("scripted setup", () => {
  it("runs every spec §8 step and moves the World to review with its drafted Entries", async () => {
    const world = londonDraft()
    const events = await play(world.id)
    expect(steps(events)).toEqual([
      "parse:started:1",
      "parse:done:1",
      "world_call:started:1",
      "world_call:done:1",
      "story_logic_call:started:1",
      "story_logic_call:done:1",
      "validate:started:1",
      "validate:done:1",
      "solvability:started:1",
      "solvability:done:1",
    ])
    const last = events.at(-1)
    expect(last?.type).toBe("result")
    expect(getWorld(world.id).setupStatus).toBe("review")
    expect(getWorld(world.id).solvability?.passed).toBe(true)
    expect(listWorldEntries(world.id).length).toBeGreaterThan(0)
    expect(last?.type === "result" && last.entries.length).toBe(listWorldEntries(world.id).length)
  })

  it("describes the parsed Brief from the Brief itself", async () => {
    const events = await play(londonDraft().id)
    const parsed = events.find((e) => e.type === "step" && e.step === "parse" && e.status === "done")
    expect(parsed?.type === "step" && parsed.detail).toBe("7 Characters, 1 Location, 3 Arcs, 1 Ending")
  })

  it("fails at the World call under drafter-error and leaves the World in draft", async () => {
    const world = londonDraft()
    const events = await play(world.id, { drafterError: true })
    expect(steps(events)).toContain("world_call:failed:1")
    const last = events.at(-1)
    expect(last).toMatchObject({ type: "error", code: "drafter_error", step: "world_call" })
    expect(getWorld(world.id).setupStatus).toBe("draft")
    expect(listWorldEntries(world.id)).toHaveLength(0)
  })

  it("retries the Story logic call with the gaps, then ends with the exact gaps under solvability-failure", async () => {
    const world = londonDraft()
    const events = await play(world.id, { solvabilityFailure: true })
    const retries = events.filter((e) => e.type === "step" && e.step === "story_logic_call" && e.status === "started")
    expect(retries.map((e) => e.type === "step" && [e.attempt, e.maxAttempts, e.detail])).toEqual([
      [1, 3, null],
      [2, 3, "fixing 2 gaps"],
      [3, 3, "fixing 2 gaps"],
    ])
    expect(events.filter((e) => e.type === "gaps")).toHaveLength(MAX_STORY_LOGIC_ATTEMPTS)
    const last = events.at(-1)
    expect(last?.type === "error" && last.code).toBe("solvability_failed")
    expect(last?.type === "error" && last.gaps?.map((g) => g.entryId)).toEqual([`${world.id}-c4`, `${world.id}-c3`])
    expect(getWorld(world.id).setupStatus).toBe("draft")
  })

  it("refuses a Brief that does not pass §7.1, without leaving draft", async () => {
    const world = createWorld({ name: "" })
    const events = await play(world.id)
    expect(events.at(-1)).toMatchObject({ type: "error", code: "invalid_brief", step: "parse" })
    expect(getWorld(world.id).setupStatus).toBe("draft")
  })

  it("puts the World back in draft when the Author leaves mid-run", async () => {
    const world = londonDraft()
    const controller = new AbortController()
    const events: SetupEvent[] = []
    const running = runScriptedSetup(world.id, {
      emit: (event) => {
        events.push(event)
        if (event.type === "step" && event.step === "world_call" && event.status === "started") controller.abort()
      },
      elapsed: () => 0,
      signal: controller.signal,
      timeScale: 0.001,
    })
    await running
    expect(events.some((e) => e.type === "result" || e.type === "error")).toBe(false)
    expect(getWorld(world.id).setupStatus).toBe("draft")
  })

  it("answers a conflict for a World that is not a draft", async () => {
    const events = await play(WORLD_IDS.review)
    expect(events).toEqual([expect.objectContaining({ type: "error", code: "conflict" })])
    expect(() => getWorld("nope")).toThrow(StoreError)
  })
})
