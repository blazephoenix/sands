/**
 * The Brief page's view of a setup run (spec §8): folds the NDJSON
 * `SetupEvent`s from `POST /api/worlds/[id]/setup` into a stepper state, and
 * words each change for the `aria-live` announcer. Pure.
 */
import {
  SETUP_STEP_LABELS,
  SETUP_STEPS,
  type SetupEvent,
  type SetupStep,
  type StreamErrorCode,
} from "@/domain/events"
import type { SolvabilityGap } from "@/domain/world"

export type StepStatus = "pending" | "running" | "done" | "failed"

export type StepState = {
  status: StepStatus
  attempt: number
  maxAttempts: number
  detail: string | null
  /** Stream time (ms since the stream started) of the current attempt's start and end. */
  startedAt: number | null
  endedAt: number | null
}

export type SetupFailure = {
  code: StreamErrorCode | "request"
  message: string
  step: SetupStep | null
  gaps: SolvabilityGap[]
}

export type SetupRun = {
  phase: "idle" | "starting" | "running" | "succeeded" | "failed"
  steps: Record<SetupStep, StepState>
  /** Gaps each failed solvability attempt reported, oldest first. */
  gapsByAttempt: { attempt: number; gaps: SolvabilityGap[] }[]
  failure: SetupFailure | null
  /** Stream time of the last event. */
  lastAt: number
  /** The latest sentence for the live region. */
  announcement: string
}

function pendingStep(): StepState {
  return {
    status: "pending",
    attempt: 1,
    maxAttempts: 1,
    detail: null,
    startedAt: null,
    endedAt: null,
  }
}

export function idleSetupRun(): SetupRun {
  return {
    phase: "idle",
    steps: Object.fromEntries(
      SETUP_STEPS.map((step) => [step, pendingStep()])
    ) as Record<SetupStep, StepState>,
    gapsByAttempt: [],
    failure: null,
    lastAt: 0,
    announcement: "",
  }
}

/** A run that has been asked for but has not answered yet. */
export function startingSetupRun(): SetupRun {
  return {
    ...idleSetupRun(),
    phase: "starting",
    announcement: "Starting setup.",
  }
}

/** "Story logic call, attempt 2 of 3 — fixing 2 gaps" */
export function stepTitle(
  step: SetupStep,
  state: Pick<StepState, "attempt" | "maxAttempts">
) {
  const label = SETUP_STEP_LABELS[step]
  return state.attempt > 1
    ? `${label}, attempt ${state.attempt} of ${state.maxAttempts}`
    : label
}

export function stepLine(step: SetupStep, state: StepState) {
  const title = stepTitle(step, state)
  return state.detail ? `${title} — ${state.detail}` : title
}

function plural(count: number, one: string) {
  return `${count} ${count === 1 ? one : `${one}s`}`
}

export function reduceSetupEvent(run: SetupRun, event: SetupEvent): SetupRun {
  switch (event.type) {
    case "step": {
      const steps = { ...run.steps }
      const previous = steps[event.step]
      const next: StepState = {
        status: event.status === "started" ? "running" : event.status,
        attempt: event.attempt,
        maxAttempts: event.maxAttempts,
        detail: event.detail,
        startedAt: event.status === "started" ? event.at : previous.startedAt,
        endedAt: event.status === "started" ? null : event.at,
      }
      steps[event.step] = next
      // A retry of the Story logic call reopens every step after it.
      if (event.status === "started" && event.attempt > 1) {
        for (const later of SETUP_STEPS.slice(
          SETUP_STEPS.indexOf(event.step) + 1
        )) {
          steps[later] = {
            ...pendingStep(),
            attempt: event.attempt,
            maxAttempts: event.maxAttempts,
          }
        }
      }
      const title = stepTitle(event.step, next)
      const announcement =
        event.status === "started"
          ? `${title}${event.detail ? `, ${event.detail}` : ""}: started.`
          : event.status === "done"
            ? `${title}: done${event.detail ? `, ${event.detail}` : ""}.`
            : `${title}: failed${event.detail ? `, ${event.detail}` : ""}.`
      return { ...run, phase: "running", steps, lastAt: event.at, announcement }
    }
    case "gaps": {
      const left = event.attempt < run.steps.solvability.maxAttempts
      return {
        ...run,
        gapsByAttempt: [
          ...run.gapsByAttempt,
          { attempt: event.attempt, gaps: event.gaps },
        ],
        lastAt: event.at,
        announcement: `Solvability found ${plural(event.gaps.length, "gap")}.${left ? " The Story logic call will try again with them as feedback." : ""}`,
      }
    }
    case "result":
      return {
        ...run,
        phase: "succeeded",
        lastAt: event.at,
        announcement: "Setup finished. Opening the setup review.",
      }
    case "error":
      return failSetupRun(
        { ...run, lastAt: event.at },
        {
          code: event.code,
          message: event.message,
          step: event.step ?? null,
          gaps: event.gaps ?? [],
        }
      )
  }
}

/** Ends a run with a failure: from an `error` event, a refused request or a dropped stream. */
export function failSetupRun(run: SetupRun, failure: SetupFailure): SetupRun {
  const steps = { ...run.steps }
  // A step still running when the stream broke off did not finish.
  for (const step of SETUP_STEPS) {
    if (steps[step].status === "running")
      steps[step] = { ...steps[step], status: "failed", endedAt: run.lastAt }
  }
  return {
    ...run,
    phase: "failed",
    steps,
    failure,
    announcement: `Setup failed. ${failure.message}`,
  }
}

/**
 * A failed solvability check names what went wrong: the story itself, names
 * the Drafter kept using that are not in the World, or no start Location
 * (setup stops for that after the World call).
 */
function solvabilityTitle(gaps: readonly SolvabilityGap[]) {
  if (gaps.some((gap) => gap.code === "no_start_location"))
    return "There is no start Location"
  if (gaps.length > 0 && gaps.every((gap) => gap.code === "unknown_name"))
    return "The Drafter used names that are not in this World"
  return "The story is not solvable yet"
}

export function failureTitle(failure: SetupFailure) {
  switch (failure.code) {
    case "drafter_error":
      return failure.step
        ? `Setup failed at the ${SETUP_STEP_LABELS[failure.step]}`
        : "The Drafter failed"
    case "solvability_failed":
      return solvabilityTitle(failure.gaps)
    case "invalid_brief":
      return "The saved Brief has problems"
    case "conflict":
      return "Setup cannot run now"
    case "request":
      return "Setup could not start"
    default:
      return "Setup stopped"
  }
}
