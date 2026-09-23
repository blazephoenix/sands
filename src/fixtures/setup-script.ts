/**
 * The scripted setup run (spec §8), for `POST /api/worlds/[id]/setup`.
 *
 * Real setup takes 30-60 s. The route plays these steps with their durations
 * multiplied by a time scale, so dev can compress them: set
 * `SANDS_SETUP_TIME_SCALE` (1 is real time, 0 is instant); dev defaults to
 * `SETUP_TIME_SCALE`.
 *
 * Scenarios (src/fixtures/scenarios.ts):
 * - `drafter-error`: the World call fails; the World goes back to `draft`.
 * - `solvability-failure`: solvability fails on every attempt; the Story logic
 *   call retries twice with the gaps as feedback, then setup ends with the
 *   exact gaps and the World goes back to `draft`.
 */
import { documentToBrief } from "@/brief/from-document"
import type { Brief } from "@/domain/brief"
import type { SetupEvent, SetupStep } from "@/domain/events"
import type { Entry } from "@/domain/entry"
import type { SolvabilityGap, World } from "@/domain/world"
import type { SandsBlock } from "@/editor/schema-config"

import { londonEntries } from "./entries"
import { getStore, nowIso, StoreError } from "./store"
import { getWorld, saveWorld } from "./worlds"

export type ScriptedSetupStep = {
  step: SetupStep
  /** Duration at real speed. */
  ms: number
  detail: string | null
}

/** One successful run: parse, World call, Story logic call, Judge validation, solvability. */
export const SETUP_SCRIPT: ScriptedSetupStep[] = [
  // The parse detail is counted from the Brief itself (`parseSummary`).
  { step: "parse", ms: 900, detail: null },
  { step: "world_call", ms: 16_000, detail: "4 Locations, 5 NPCs, 2 Exit conditions" },
  { step: "story_logic_call", ms: 18_000, detail: "5 Clues, 4 Knowledge, 1 Decisive action" },
  { step: "validate", ms: 7_000, detail: "2 Entries flagged by the Judge" },
  { step: "solvability", ms: 600, detail: null },
]

/** Default speed-up in dev: about 11 s instead of 43 s. */
export const SETUP_TIME_SCALE = 0.25

/** A Story logic retry sees the gaps as feedback and only redrafts what failed, so it is quicker. */
export const RETRY_MS: Partial<Record<SetupStep, number>> = {
  story_logic_call: 12_000,
  validate: 3_000,
}

export const MAX_STORY_LOGIC_ATTEMPTS = 3

/** Gaps reported on each attempt under the `solvability-failure` scenario. */
export function solvabilityFailureGaps(prefix: string): SolvabilityGap[] {
  return [
    {
      code: "unreachable_clue",
      message: "C4 sits at Tower Bridge, which no Location connects to the start location.",
      entryId: `${prefix}-c4`,
      arcIndex: null,
    },
    {
      code: "clue_revealed_too_late",
      message: "C3 is held only by Nell Garvey, who reveals it at high Band. Required Clues must be revealed at normal Band or lower.",
      entryId: `${prefix}-c3`,
      arcIndex: null,
    },
  ]
}

/** The Entries a successful setup drafts for a World: the London Codex, awaiting review. */
export function draftedEntries(worldId: string, prefix: string): Entry[] {
  return londonEntries(worldId, prefix, "review")
}

/** The time scale for this server: `SANDS_SETUP_TIME_SCALE`, else the dev default, else real time. */
export function setupTimeScale(): number {
  const raw = process.env.SANDS_SETUP_TIME_SCALE
  const parsed = raw === undefined ? Number.NaN : Number.parseFloat(raw)
  if (Number.isFinite(parsed) && parsed >= 0) return parsed
  return process.env.NODE_ENV === "production" ? 1 : SETUP_TIME_SCALE
}

/** Throws a 409 unless setup can start: only a `draft` World runs setup. */
export function assertSetupCanStart(world: World) {
  if (world.setupStatus === "draft") return
  throw new StoreError(
    "conflict",
    world.setupStatus === "drafting"
      ? "Setup is already running for this World. Wait for it to finish."
      : "Setup has already run for this World. Open the setup review instead."
  )
}

function plural(count: number, one: string, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`
}

/** "8 Characters, 1 Location, 3 Arcs, 1 Ending", from the Brief itself. */
export function parseSummary(brief: Brief) {
  const parts = [plural(brief.characters.length, "Character")]
  if (brief.locations.length > 0) parts.push(plural(brief.locations.length, "Location"))
  parts.push(plural(brief.arcs.length, "Arc"), "1 Ending")
  return parts.join(", ")
}

export type SetupRunOptions = {
  emit: (event: SetupEvent) => void
  /** Milliseconds since the stream started. */
  elapsed: () => number
  signal: AbortSignal
  timeScale: number
  drafterError?: boolean
  solvabilityFailure?: boolean
}

class SetupAborted extends Error {}

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(new SetupAborted())
    if (ms <= 0) return resolve()
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      reject(new SetupAborted())
    }
    signal.addEventListener("abort", onAbort, { once: true })
  })
}

/** Puts a World's setup status back, keeping everything the Author wrote. */
function setStatus(worldId: string, setupStatus: World["setupStatus"], patch: Partial<World> = {}) {
  const world = getWorld(worldId)
  return saveWorld({ ...world, ...patch, setupStatus, updatedAt: nowIso() })
}

/** Replaces a World's template Entries with the drafted Codex. */
function storeDraftedEntries(world: World): Entry[] {
  const store = getStore()
  for (const [id, entry] of store.entries) {
    if (entry.worldId === world.id && entry.sessionId === null) store.entries.delete(id)
  }
  const entries = draftedEntries(world.id, world.id)
  for (const entry of entries) store.entries.set(entry.id, entry)
  return entries
}

/**
 * Plays one scripted setup run for a `draft` World, emitting spec §8 progress.
 * Ends with exactly one `result` or `error` event, or silently when aborted.
 * Every way out other than success leaves the World in `draft` with its Brief
 * untouched (spec §13).
 */
export async function runScriptedSetup(worldId: string, options: SetupRunOptions): Promise<void> {
  const { emit, elapsed, signal, timeScale } = options
  const pause = (ms: number) => wait(ms * timeScale, signal)
  const durationOf = (step: SetupStep, attempt = 1) =>
    (attempt > 1 ? RETRY_MS[step] : undefined) ?? SETUP_SCRIPT.find((s) => s.step === step)!.ms
  const scripted = (step: SetupStep) => SETUP_SCRIPT.find((s) => s.step === step)!.detail
  const step = (
    name: SetupStep,
    status: "started" | "done" | "failed",
    detail: string | null,
    attempt = 1,
    maxAttempts = 1
  ) => emit({ type: "step", step: name, status, attempt, maxAttempts, detail, at: elapsed() })

  const world = getWorld(worldId)
  try {
    assertSetupCanStart(world)
  } catch (error) {
    // Another request started setup between the route's check and this run.
    if (!(error instanceof StoreError)) throw error
    emit({ type: "error", code: "conflict", message: error.message, at: elapsed() })
    return
  }

  // 1. Parse: the stored Brief document must pass §7.1.
  step("parse", "started", null)
  await pause(durationOf("parse"))
  const conversion = documentToBrief(world.briefDoc as SandsBlock[])
  if (!conversion.validation.success) {
    const count = conversion.issues.length
    step("parse", "failed", plural(count, "problem"))
    emit({
      type: "error",
      code: "invalid_brief",
      step: "parse",
      message: `The saved Brief has ${plural(count, "problem")}: ${conversion.issues.map((i) => i.message).join(" ")} Fix ${count === 1 ? "it" : "them"} and run setup again.`,
      at: elapsed(),
    })
    return
  }
  const brief = conversion.validation.brief
  setStatus(worldId, "drafting", { brief })
  let finished = false
  try {
    step("parse", "done", parseSummary(brief))

    // 2.1 World call.
    step("world_call", "started", null)
    await pause(durationOf("world_call"))
    if (options.drafterError) {
      step("world_call", "failed", "No answer from the Drafter")
      emit({
        type: "error",
        code: "drafter_error",
        step: "world_call",
        message:
          "The Drafter did not answer the World call (it timed out twice). Nothing was drafted and your Brief is unchanged. Run setup again; if it keeps failing, check the Drafter's configuration.",
        at: elapsed(),
      })
      return
    }
    step("world_call", "done", scripted("world_call"))

    // 2.2 Story logic call, 3.1 Judge validation, 3.2 solvability: at most three attempts.
    let gaps: SolvabilityGap[] = []
    for (let attempt = 1; attempt <= MAX_STORY_LOGIC_ATTEMPTS; attempt++) {
      const max = MAX_STORY_LOGIC_ATTEMPTS
      step("story_logic_call", "started", attempt > 1 ? `fixing ${plural(gaps.length, "gap")}` : null, attempt, max)
      await pause(durationOf("story_logic_call", attempt))
      step("story_logic_call", "done", scripted("story_logic_call"), attempt, max)

      step("validate", "started", null, attempt, max)
      await pause(durationOf("validate", attempt))
      step("validate", "done", scripted("validate"), attempt, max)

      step("solvability", "started", null, attempt, max)
      await pause(durationOf("solvability", attempt))
      if (!options.solvabilityFailure) {
        step("solvability", "done", "Every Decisive action can be reached", attempt, max)
        break
      }
      gaps = solvabilityFailureGaps(worldId)
      step("solvability", "failed", plural(gaps.length, "gap"), attempt, max)
      emit({ type: "gaps", attempt, gaps, at: elapsed() })
      if (attempt === max) {
        emit({
          type: "error",
          code: "solvability_failed",
          step: "solvability",
          gaps,
          message: `Setup tried ${plural(max, "time")} and the story is still not solvable. Change the Brief so the gaps below can close (for example, add a Location or say who knows what), then run setup again.`,
          at: elapsed(),
        })
        return
      }
    }

    // 4. Review: the World moves on with its drafted Codex.
    const entries = storeDraftedEntries(world)
    const reviewed = setStatus(worldId, "review", {
      solvability: { passed: true, gaps: [], checkedAt: nowIso() },
    })
    finished = true
    emit({ type: "result", world: reviewed, entries, at: elapsed() })
  } catch (error) {
    if (error instanceof SetupAborted) return
    throw error
  } finally {
    if (!finished) setStatus(worldId, "draft")
  }
}
