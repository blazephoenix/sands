"use client"

/**
 * The story pane: a manuscript. It opens with the Opening, the first scene
 * the Writer sets before the Player acts; then Passages flow as plain
 * paragraphs at a reading measure, with the Player's inputs as small muted
 * lines between them. Below it, the composer: the action input, one live
 * progress line, and an inline error with Retry when a Turn fails.
 */
import * as React from "react"
import { ArrowUpIcon, RotateCcwIcon, TriangleAlertIcon } from "lucide-react"

import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from "@/components/ui/input-group"
import { Kbd } from "@/components/ui/kbd"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { TextGenerateEffect } from "@/components/ui/text-generate-effect"
import type { TurnPhase } from "@/domain/events"
import { turnLabel, type Turn } from "@/domain/session"
import { isTypingTarget } from "@/lib/keyboard"
import { cn } from "@/lib/utils"

import type { TurnRun } from "./use-session"

/** The prose column: about 65 characters a line, generous leading. */
export const PROSE = "mx-auto w-full max-w-[65ch] px-4"

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/** Scrolls an element into view. Block body: Chrome returns a Promise from scrollIntoView, and React throws on an effect's return value. */
export function scrollToElement(element: Element | null, block: ScrollLogicalPosition = "start") {
  element?.scrollIntoView({ block, behavior: prefersReducedMotion() ? "auto" : "smooth" })
}

// Passage reveal

/**
 * Reveals a Passage word by word (fading in from a blur). Click, Space or
 * Escape completes it at once; under reduced motion it is instant. Screen
 * readers get the whole Passage from the page's live region instead.
 */
function PassageReveal({ text, onDone }: { text: string; onDone: () => void }) {
  const [instant, setInstant] = React.useState(false)

  React.useEffect(() => {
    if (instant) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" || (event.key === " " && !isTypingTarget(event.target))) {
        if (event.key === " ") event.preventDefault()
        setInstant(true)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [instant])

  return (
    <span aria-hidden onClick={() => setInstant(true)} className={cn(!instant && "cursor-pointer")}>
      <TextGenerateEffect words={text} stagger={0.04} duration={0.5} instant={instant} onComplete={onDone} />
    </span>
  )
}

// Manuscript

export function TurnSection({
  turn,
  revealing,
  onRevealed,
  ref,
}: {
  turn: Turn
  revealing: boolean
  onRevealed: () => void
  ref?: React.Ref<HTMLElement>
}) {
  return (
    <section ref={ref} aria-label={turnLabel(turn)} className="flex scroll-mt-24 flex-col gap-3">
      {/* The Opening has no Player input, so no input line above it. */}
      {turn.playerInput === null ? null : (
        <p className="text-sm text-muted-foreground">
          <span aria-hidden>› </span>
          <span className="sr-only">You: </span>
          {turn.playerInput}
        </p>
      )}
      <p className="text-lg leading-8 text-pretty">
        {revealing ? (
          <>
            <PassageReveal text={turn.passage} onDone={onRevealed} />
            <span className="sr-only">{turn.passage}</span>
          </>
        ) : (
          turn.passage
        )}
      </p>
    </section>
  )
}

/**
 * The story column while the Opening is written: the label it will carry, the
 * live progress line, and nothing that pretends to be prose (ADR-0003). Its
 * height roughly matches a Passage, so the Opening does not shift the page
 * when it arrives. On failure: the cause and Retry; the Session has no Turns.
 */
export function OpeningPending({ run, onRetry }: { run: TurnRun; onRetry: () => void }) {
  if (run.status === "failed") {
    return (
      <Alert variant="destructive">
        <TriangleAlertIcon />
        <AlertTitle>The Opening did not finish</AlertTitle>
        <AlertDescription>{run.message} The Session has no Turns yet, so nothing was lost.</AlertDescription>
        <AlertAction>
          <Button variant="outline" size="sm" onClick={onRetry} autoFocus>
            <RotateCcwIcon data-icon="inline-start" />
            Retry
          </Button>
        </AlertAction>
      </Alert>
    )
  }
  return (
    <section aria-label="Opening" aria-busy="true" className="flex min-h-80 flex-col gap-3">
      <p className="text-sm text-muted-foreground">The story begins once the Judge has passed its first scene.</p>
      <p role="status" aria-live="polite" className="flex items-center gap-2 text-lg leading-8 text-muted-foreground">
        <Spinner aria-hidden />
        {progressLabel(run) ?? OPENING_FIRST_LABEL}
      </p>
    </section>
  )
}

/** After the Opening, until the Player first acts: a few ways in, for a Player who is not sure where to start. */
export function FirstActionHints({ playerName, suggestions, onSuggest }: { playerName: string; suggestions: string[]; onSuggest: (text: string) => void }) {
  return (
    <div className="flex animate-in flex-col gap-2 duration-300 fade-in-0 motion-reduce:animate-none">
      <p className="text-sm text-muted-foreground">Type what {playerName} does, or begin with one of these.</p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <Button key={suggestion} variant="outline" size="sm" onClick={() => onSuggest(suggestion)}>
            {suggestion}
          </Button>
        ))}
      </div>
    </div>
  )
}

export function StorySkeleton() {
  return (
    <div className={cn(PROSE, "flex flex-col gap-10 py-10")} aria-busy="true" aria-label="Loading the Session">
      {[0, 1, 2].map((index) => (
        <div key={index} className="flex flex-col gap-3">
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-4/5" />
        </div>
      ))}
    </div>
  )
}

// Composer

const PHASE_LABELS: Record<TurnPhase, (round: number | null) => string> = {
  waiting_background: () => "Waiting for the last Turn's background work…",
  reading: () => "Reading your action…",
  resolving: () => "Resolving…",
  writing: (round) => `Writing, Round ${round ?? 1}…`,
  judging: (round) => (round && round > 1 ? `Judging, Round ${round}…` : "Judging…"),
}

const OPENING_FIRST_LABEL = "Setting the scene…"

export function progressLabel(run: TurnRun) {
  if (run.status !== "running") return null
  if (run.input === null) {
    // The Opening: no input to read, no Outcome to resolve. Its first writing is setting the scene.
    if (!run.phase || (run.phase === "writing" && (run.round ?? 1) === 1)) return OPENING_FIRST_LABEL
    return PHASE_LABELS[run.phase](run.round)
  }
  return run.phase ? PHASE_LABELS[run.phase](run.round) : "Sending your action…"
}

export function Composer({
  value,
  onValueChange,
  onSubmit,
  run,
  revealing,
  backgroundPending,
  awaitingOpening,
  playerName,
  inputRef,
}: {
  value: string
  onValueChange: (value: string) => void
  onSubmit: (input: string) => void
  run: TurnRun
  revealing: boolean
  backgroundPending: boolean
  /** The Opening is being written or revealed: the Player can act once it has been read. */
  awaitingOpening: boolean
  playerName: string
  inputRef: React.RefObject<HTMLTextAreaElement | null>
}) {
  // The Opening's progress and errors live in the story column, not here.
  const openingRun = run.status !== "idle" && run.input === null
  const busy = run.status === "running" || awaitingOpening
  const progress = openingRun ? null : progressLabel(run)
  const submit = () => {
    const input = value.trim()
    if (!input || busy) return
    onSubmit(input)
  }

  let status: React.ReactNode = null
  if (progress) {
    status = (
      <>
        <Spinner aria-hidden />
        {progress}
      </>
    )
  } else if (revealing) {
    status = "Click, Space or Esc to show the whole Passage."
  } else if (awaitingOpening) {
    status = "You can act once the Opening has been written."
  } else if (backgroundPending) {
    status = (
      <>
        <Spinner aria-hidden className="opacity-60" />
        Background work from the last Turn is still running.
      </>
    )
  }

  return (
    <div className="sticky bottom-0 z-10 bg-background pt-2 pb-4">
      <div className={cn(PROSE, "flex flex-col gap-2")}>
        {run.status === "failed" && run.input !== null ? (
          <Alert variant="destructive">
            <TriangleAlertIcon />
            <AlertTitle>The Turn did not finish</AlertTitle>
            <AlertDescription>{run.message}</AlertDescription>
            <AlertAction>
              <Button variant="outline" size="sm" onClick={() => onSubmit(run.input ?? "")}>
                <RotateCcwIcon data-icon="inline-start" />
                Retry
              </Button>
            </AlertAction>
          </Alert>
        ) : null}
        <form
          onSubmit={(event) => {
            event.preventDefault()
            submit()
          }}
        >
          <InputGroup>
            <InputGroupTextarea
              ref={inputRef}
              aria-label={`What ${playerName} does`}
              placeholder={`What does ${playerName} do?`}
              value={value}
              rows={2}
              disabled={busy}
              className="max-h-48 min-h-16 text-base"
              onChange={(event) => onValueChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault()
                  submit()
                }
              }}
            />
            <InputGroupAddon align="block-end" className="justify-between">
              <span className="flex items-center gap-1 text-xs font-normal">
                <Kbd>Enter</Kbd> to act
                <span aria-hidden>·</span>
                <Kbd>Shift</Kbd>
                <span aria-hidden>+</span>
                <Kbd>Enter</Kbd> new line
              </span>
              <InputGroupButton type="submit" variant="default" size="sm" disabled={busy || !value.trim()} aria-label="Act">
                {busy && !awaitingOpening ? <Spinner data-icon="inline-start" /> : <ArrowUpIcon data-icon="inline-start" />}
                Act
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </form>
        <p role="status" aria-live="polite" className="flex h-5 items-center gap-2 text-sm text-muted-foreground">
          {status}
        </p>
      </div>
    </div>
  )
}
