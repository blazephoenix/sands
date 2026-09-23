import { describe, expect, it } from "vitest"

import type { SetupEvent } from "@/domain/events"

import { failSetupRun, idleSetupRun, reduceSetupEvent, startingSetupRun, stepLine } from "./setup-progress"

const step = (
  name: Extract<SetupEvent, { type: "step" }>["step"],
  status: "started" | "done" | "failed",
  at: number,
  attempt = 1,
  detail: string | null = null
): SetupEvent => ({ type: "step", step: name, status, attempt, maxAttempts: attempt > 1 || name !== "parse" ? 3 : 1, detail, at })

const fold = (events: SetupEvent[]) => events.reduce(reduceSetupEvent, startingSetupRun())

describe("setup progress", () => {
  it("tracks each step's status, detail and timing", () => {
    const run = fold([step("parse", "started", 0), step("parse", "done", 200, 1, "7 Characters"), step("world_call", "started", 210)])
    expect(run.phase).toBe("running")
    expect(run.steps.parse).toMatchObject({ status: "done", startedAt: 0, endedAt: 200, detail: "7 Characters" })
    expect(run.steps.world_call.status).toBe("running")
    expect(run.steps.story_logic_call.status).toBe("pending")
    expect(run.announcement).toBe("World call: started.")
  })

  it("spells out a Story logic retry and reopens the steps after it", () => {
    const run = fold([
      step("story_logic_call", "started", 0),
      step("story_logic_call", "done", 10),
      step("validate", "started", 10),
      step("validate", "done", 20),
      step("solvability", "started", 20),
      step("solvability", "failed", 30, 1, "2 gaps"),
      { type: "gaps", attempt: 1, gaps: [], at: 30 },
      step("story_logic_call", "started", 31, 2, "fixing 2 gaps"),
    ])
    expect(stepLine("story_logic_call", run.steps.story_logic_call)).toBe("Story logic call, attempt 2 of 3 — fixing 2 gaps")
    expect(run.steps.validate).toMatchObject({ status: "pending", attempt: 2 })
    expect(run.steps.solvability).toMatchObject({ status: "pending", attempt: 2 })
    expect(run.gapsByAttempt).toHaveLength(1)
    expect(run.announcement).toBe("Story logic call, attempt 2 of 3, fixing 2 gaps: started.")
  })

  it("ends in failure with the cause and the gaps, and marks a step cut off mid-run as failed", () => {
    const gaps = [{ code: "unreachable_clue" as const, message: "C4 is unreachable.", entryId: "c4", arcIndex: null }]
    const run = fold([
      step("solvability", "started", 0, 3),
      { type: "error", code: "solvability_failed", message: "Still not solvable.", gaps, step: "solvability", at: 5 },
    ])
    expect(run.phase).toBe("failed")
    expect(run.failure).toMatchObject({ code: "solvability_failed", gaps })
    expect(run.steps.solvability.status).toBe("failed")

    const dropped = failSetupRun(fold([step("world_call", "started", 0)]), { code: "request", message: "Connection lost.", step: null, gaps: [] })
    expect(dropped.steps.world_call.status).toBe("failed")
    expect(dropped.announcement).toBe("Setup failed. Connection lost.")
  })

  it("succeeds on the result", () => {
    const world = { id: "w" } as never
    const run = reduceSetupEvent(idleSetupRun(), { type: "result", world, entries: [], at: 9 })
    expect(run.phase).toBe("succeeded")
  })
})
