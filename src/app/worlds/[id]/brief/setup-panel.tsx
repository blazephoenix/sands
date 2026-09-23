"use client"

/**
 * Setup progress (spec §8) beside the Brief: the five steps as a stepper with
 * elapsed times, Story logic retries spelled out ("Story logic call, attempt 2
 * of 3 — fixing 2 gaps"), and the failure states with Retry. The page keeps a
 * `SetupLiveRegion` mounted so every change is announced.
 */
import * as React from "react"
import {
  CircleCheckIcon,
  CircleDashedIcon,
  CircleXIcon,
  RotateCcwIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { SETUP_STEPS, type SetupStep } from "@/domain/events"
import { cn } from "@/lib/utils"

import {
  failureTitle,
  stepTitle,
  type SetupRun,
  type StepState,
} from "./setup-progress"

function formatElapsed(ms: number) {
  const seconds = Math.max(0, ms) / 1000
  if (seconds < 60) return `${seconds.toFixed(1)} s`
  const minutes = Math.floor(seconds / 60)
  return `${minutes} min ${Math.floor(seconds % 60)} s`
}

/** Milliseconds since `start`, refreshed while `running`. */
function useElapsed(start: number | null, running: boolean) {
  const [now, setNow] = React.useState(() => Date.now())
  React.useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => setNow(Date.now()), 100)
    return () => window.clearInterval(timer)
  }, [running])
  return start === null ? 0 : now - start
}

function StepIcon({ status }: { status: StepState["status"] }) {
  switch (status) {
    case "pending":
      return (
        <CircleDashedIcon
          className="size-4 text-muted-foreground"
          aria-hidden
        />
      )
    case "running":
      return (
        <Spinner className="size-4 motion-reduce:animate-none" aria-hidden />
      )
    case "done":
      return <CircleCheckIcon className="size-4" aria-hidden />
    case "failed":
      return <CircleXIcon className="size-4 text-destructive" aria-hidden />
  }
}

const STATUS_WORDS: Record<StepState["status"], string> = {
  pending: "not started",
  running: "running",
  done: "done",
  failed: "failed",
}

export function SetupPanel({
  run,
  streamStartedAt,
  onRetry,
  onDismiss,
  canRetry,
}: {
  run: SetupRun
  /** Client clock when the stream started, for the ticking elapsed time. */
  streamStartedAt: number | null
  onRetry: () => void
  onDismiss: () => void
  canRetry: boolean
}) {
  const active = run.phase === "starting" || run.phase === "running"
  const total = useElapsed(streamStartedAt, active)
  const retryRef = React.useRef<HTMLButtonElement>(null)

  // Focus lands on Retry when a run fails, so the next action is one key away.
  React.useEffect(() => {
    if (run.phase === "failed") retryRef.current?.focus()
  }, [run.phase])

  if (run.phase === "idle") return null

  const elapsedOf = (state: StepState) => {
    if (state.startedAt === null) return null
    if (state.status === "running") return total - state.startedAt
    return state.endedAt === null ? null : state.endedAt - state.startedAt
  }

  return (
    <section
      aria-labelledby="setup-progress-title"
      className="flex flex-col gap-3"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2
          id="setup-progress-title"
          className="font-heading text-sm font-semibold"
        >
          {run.phase === "succeeded"
            ? "Setup finished"
            : run.phase === "failed"
              ? "Setup stopped"
              : "Running setup"}
        </h2>
        <span className="text-xs text-muted-foreground tabular-nums">
          {formatElapsed(active ? total : run.lastAt)}
        </span>
      </div>

      <ol className="flex flex-col gap-2.5" aria-label="Setup steps">
        {SETUP_STEPS.map((step: SetupStep) => {
          const state = run.steps[step]
          const elapsed = elapsedOf(state)
          const attemptGaps = step === "solvability" ? run.gapsByAttempt : []
          return (
            <li
              key={step}
              className="flex gap-2.5"
              aria-current={state.status === "running" ? "step" : undefined}
            >
              <span className="flex h-5 shrink-0 items-center">
                <StepIcon status={state.status} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className={cn(
                      "text-sm leading-5",
                      state.status === "pending" && "text-muted-foreground",
                      state.status === "failed" && "text-destructive"
                    )}
                  >
                    {stepTitle(step, state)}
                    <span className="sr-only">
                      , {STATUS_WORDS[state.status]}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {elapsed === null ? "" : formatElapsed(elapsed)}
                  </span>
                </div>
                {state.detail ? (
                  <span className="text-xs leading-relaxed text-muted-foreground">
                    {state.detail}
                  </span>
                ) : null}
                {attemptGaps
                  .filter((entry) => entry.attempt < state.attempt)
                  .map((entry) => (
                    <span
                      key={entry.attempt}
                      className="text-xs leading-relaxed text-muted-foreground"
                    >
                      Attempt {entry.attempt} found{" "}
                      {entry.gaps.length === 1
                        ? "1 gap"
                        : `${entry.gaps.length} gaps`}
                      ; the Story logic call tried again with{" "}
                      {entry.gaps.length === 1 ? "it" : "them"} as feedback.
                    </span>
                  ))}
              </div>
            </li>
          )
        })}
      </ol>

      {run.phase === "failed" && run.failure ? (
        <Alert variant="destructive">
          <TriangleAlertIcon aria-hidden />
          <AlertTitle>{failureTitle(run.failure)}</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <p>{run.failure.message}</p>
            {run.failure.gaps.length > 0 ? (
              <ul className="flex list-disc flex-col gap-1 ps-4">
                {run.failure.gaps.map((gap) => (
                  <li key={`${gap.code}-${gap.entryId ?? gap.arcIndex}`}>
                    {gap.message}
                  </li>
                ))}
              </ul>
            ) : null}
            {run.failure.code === "conflict" ? null : (
              <p>
                The World is still a draft, and nothing you wrote has changed.
              </p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                ref={retryRef}
                size="sm"
                variant="outline"
                onClick={onRetry}
                disabled={!canRetry}
              >
                <RotateCcwIcon data-icon="inline-start" aria-hidden />
                Retry setup
              </Button>
              <Button size="sm" variant="ghost" onClick={onDismiss}>
                <XIcon data-icon="inline-start" aria-hidden />
                Dismiss
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}
    </section>
  )
}

/** The polite live region every setup change is announced through. Always mounted, so the first message is read. */
export function SetupLiveRegion({ text }: { text: string }) {
  return (
    <div className="sr-only" aria-live="polite" aria-atomic="true">
      {text}
    </div>
  )
}
