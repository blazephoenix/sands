/**
 * POST /api/sessions/[id]/turn: play one Turn (spec §9.1). Streams NDJSON
 * progress, then the whole Turn; never prose (ADR-0003). Nothing is saved
 * unless a Passage ships, so a failure or a disconnect changes nothing.
 *
 * Fixture-backed: it plays the Turn script with realistic timing (3-5 s).
 * Scenarios: `judge-outage` fails while judging Round 1; `second-round` and
 * `flagged-turn` force extra Rounds; `background-pending` makes the Turn wait
 * for the last Turn's background work; `ending-*` force an Ending.
 */
import { turnRequestSchema } from "@/domain/api"
import type { TurnEvent } from "@/domain/events"
import type { ScenarioId } from "@/fixtures/scenarios"
import { StoreError } from "@/fixtures/store"
import {
  commitTurn,
  getSession,
  pendingBackground,
  planTurn,
  settleBackground,
  type ForcedEnding,
  type RoundsMode,
} from "@/fixtures/sessions"
import { handle, HttpError, readJson } from "@/server/http"
import { ndjsonResponse } from "@/server/ndjson"
import { getScenarios, scenarioGate } from "@/server/scenarios"

type Context = { params: Promise<{ id: string }> }

/** How long a forced `background-pending` wait lasts. */
const FORCED_BACKGROUND_WAIT_MS = 2200

function forcedEnding(scenarios: Set<ScenarioId>): ForcedEnding | null {
  if (scenarios.has("ending-win")) return "win"
  if (scenarios.has("ending-death")) return "death"
  if (scenarios.has("ending-removed")) return "removed"
  return null
}

function roundsMode(scenarios: Set<ScenarioId>): RoundsMode {
  if (scenarios.has("flagged-turn")) return "flagged"
  if (scenarios.has("second-round")) return "second-round"
  return "script"
}

/** Waits, unless the client goes away first. Resolves false when aborted. */
function pause(ms: number, signal: AbortSignal) {
  return new Promise<boolean>((resolve) => {
    if (signal.aborted) return resolve(false)
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort)
      resolve(true)
    }, ms)
    function onAbort() {
      clearTimeout(timer)
      resolve(false)
    }
    signal.addEventListener("abort", onAbort, { once: true })
  })
}

/** A little variation, so progress does not tick like a metronome. */
function jitter(ms: number) {
  return Math.round(ms * (0.85 + Math.random() * 0.3))
}

export const POST = handle(async (request: Request, { params }: Context) => {
  const blocked = await scenarioGate(request)
  if (blocked) return blocked
  const { id } = await params
  const { input } = await readJson(request, turnRequestSchema)
  const session = getSession(id)
  if (session.ending !== "none") {
    throw new HttpError(409, "conflict", "This Session has ended. Start a new Session from its World to play again.")
  }
  const scenarios = getScenarios(request)

  return ndjsonResponse<TurnEvent>(
    async (emit, elapsed, signal) => {
      // Step 1: wait for the last Turn's background work (spec §9.1).
      const pending = pendingBackground(id)
      if (pending) {
        emit({ type: "phase", phase: "waiting_background", round: null, at: elapsed() })
        const wait = scenarios.has("background-pending") ? FORCED_BACKGROUND_WAIT_MS : Math.max(pending.remainingMs, 600)
        if (!(await pause(wait, signal))) return
        settleBackground(id, { force: true })
      }

      let plan: ReturnType<typeof planTurn>
      try {
        plan = planTurn(id, input, { rounds: roundsMode(scenarios), ending: forcedEnding(scenarios) })
      } catch (error) {
        if (!(error instanceof StoreError)) throw error
        emit({ type: "error", code: error.code === "not_found" ? "not_found" : "conflict", message: error.message, at: elapsed() })
        return
      }
      for (const step of plan.phases) {
        emit({ type: "phase", phase: step.phase, round: step.round, at: elapsed() })
        if (!(await pause(jitter(step.ms), signal))) return
        if (scenarios.has("judge-outage") && step.phase === "judging") {
          emit({
            type: "error",
            code: "judge_outage",
            message: `The Judge did not answer while judging Round ${step.round ?? 1}, so no Passage was shipped and nothing in the Session changed. Try again in a moment.`,
            at: elapsed(),
          })
          return
        }
      }

      let committed: ReturnType<typeof commitTurn>
      try {
        committed = commitTurn(plan)
      } catch (error) {
        if (!(error instanceof StoreError)) throw error
        emit({ type: "error", code: "conflict", message: error.message, at: elapsed() })
        return
      }
      const { turn, session: saved } = committed
      emit({ type: "result", turn, session: saved, entries: [], at: elapsed() })
    },
    { request }
  )
})
