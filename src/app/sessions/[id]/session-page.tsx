"use client"

/**
 * `/sessions/[id]`: the Player plays a Session. The story column reads like a
 * manuscript: the Opening, then each Player input as a small muted line and
 * the Passage it led to. Below the latest Passage, the Writer's choices
 * (keys 1 to 4) and a box for the Player's own action. A Passage that just
 * arrived reveals word by word; click, Space or Escape completes it.
 *
 * Header: the harness pane switch and, while it is on, the harness pane
 * (key `t`), which shows what the Writer was given and sent back each Turn.
 *
 * States: loading, not found, load error with Retry, writing (the input stays
 * on screen), Turn error with Retry (the input is kept), ended.
 */
import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowUpIcon,
  FlagIcon,
  FlaskConicalIcon,
  RotateCcwIcon,
  SearchXIcon,
  TriangleAlertIcon,
} from "lucide-react"

import {
  ShellActions,
  ShellBreadcrumbs,
  worldCrumbs,
} from "@/components/app-shell"
import { ShortcutKeys } from "@/components/shortcut-keys"
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import { Kbd } from "@/components/ui/kbd"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { TextGenerateEffect } from "@/components/ui/text-generate-effect"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { sessionHref, worldHref } from "@/components/worlds/world-links"
import type { GetSessionResponse } from "@/domain/api"
import type { Turn } from "@/domain/session"
import { api, ApiError, isAbortError } from "@/lib/api-client"
import { isTypingTarget, useSingleKeyShortcut } from "@/lib/keyboard"
import { formatDayAndTime } from "@/lib/time"
import { cn } from "@/lib/utils"
import { plainText } from "@/skeleton/hidden-text"

import { HarnessPane, turnLabel } from "./harness-pane"
import {
  PassageText,
  usePassageMatchers,
  type PassageMatchers,
} from "./passage-text"
import { useHarnessSwitch } from "./harness-switch"

/** The prose column: about 65 characters a line. */
const PROSE = "mx-auto w-full max-w-[65ch] px-4"
const HARNESS_SHORTCUT = "t"

type Load =
  | { state: "loading" }
  | { state: "error"; error: ApiError }
  | { state: "ready"; data: GetSessionResponse }

function asApiError(error: unknown, fallback: string) {
  return error instanceof ApiError
    ? error
    : new ApiError(0, "internal", fallback)
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
}

function scrollToElement(element: Element | null) {
  element?.scrollIntoView({
    block: "start",
    behavior: prefersReducedMotion() ? "auto" : "smooth",
  })
}

export function SessionPage({ sessionId }: { sessionId: string }) {
  const [load, setLoad] = React.useState<Load>({ state: "loading" })
  const [attempt, setAttempt] = React.useState(0)

  React.useEffect(() => {
    const controller = new AbortController()
    api
      .getSession(sessionId, controller.signal)
      .then((data) => setLoad({ state: "ready", data }))
      .catch((error: unknown) => {
        if (isAbortError(error)) return
        setLoad({
          state: "error",
          error: asApiError(error, "The Session did not load. Try again."),
        })
      })
    return () => controller.abort()
  }, [sessionId, attempt])

  const retry = () => {
    setLoad({ state: "loading" })
    setAttempt((n) => n + 1)
  }

  if (load.state === "loading") return <StorySkeleton />
  if (load.state === "error") {
    if (load.error.status === 404) {
      return (
        <div className={cn(PROSE, "py-16")}>
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <SearchXIcon />
              </EmptyMedia>
              <EmptyTitle>There is no such Session</EmptyTitle>
              <EmptyDescription>{load.error.message}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button render={<Link href="/" />} nativeButton={false}>
                Back to your Worlds
              </Button>
            </EmptyContent>
          </Empty>
        </div>
      )
    }
    return (
      <div className={cn(PROSE, "py-16")}>
        <Alert variant="destructive">
          <TriangleAlertIcon aria-hidden />
          <AlertTitle>The Session did not load</AlertTitle>
          <AlertDescription>{load.error.message}</AlertDescription>
          <AlertAction>
            <Button variant="outline" size="sm" onClick={retry} autoFocus>
              Retry
            </Button>
          </AlertAction>
        </Alert>
      </div>
    )
  }
  return (
    <SessionView
      data={load.data}
      onChange={(data) => setLoad({ state: "ready", data })}
    />
  )
}

/** A Turn being played: the input stays on screen until its Passage arrives or it fails. */
type Pending = { input: string; error: ApiError | null }

function SessionView({
  data,
  onChange,
}: {
  data: GetSessionResponse
  onChange: (data: GetSessionResponse) => void
}) {
  const { session, turns } = data
  const router = useRouter()
  const [draft, setDraft] = React.useState("")
  const [pending, setPending] = React.useState<Pending | null>(null)
  const [revealing, setRevealing] = React.useState<string | null>(null)
  const [announcement, setAnnouncement] = React.useState("")
  const [restarting, setRestarting] = React.useState<ApiError | "busy" | null>(
    null
  )
  const inputRef = React.useRef<HTMLTextAreaElement>(null)
  const turnRefs = React.useRef(new Map<string, HTMLElement>())

  const [harnessOn, setHarnessOn] = useHarnessSwitch()
  const [harnessOpen, setHarnessOpen] = React.useState(false)
  useSingleKeyShortcut(HARNESS_SHORTCUT, () => setHarnessOpen((o) => !o), {
    enabled: harnessOn,
  })

  const latest = turns[turns.length - 1]
  const ended = session.ending !== null
  const writing = pending !== null && pending.error === null
  const playerName =
    plainText(session.skeleton.playSettings.playerCharacter).trim() ||
    "your character"
  const world = { id: session.worldId, name: data.worldName }
  const glossary = React.useMemo(
    () => turns.flatMap((turn) => turn.glossary),
    [turns]
  )
  const matchers = usePassageMatchers(session.skeleton, glossary)
  const sessionLabel = `Session started ${formatDayAndTime(session.createdAt)}`

  // On load: the latest Passage in view and the cursor in the input.
  React.useEffect(() => {
    if (turns.length > 1) window.scrollTo({ top: document.body.scrollHeight })
    inputRef.current?.focus()
    // Only on first render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // A new Passage: bring it into view.
  React.useEffect(() => {
    if (revealing) scrollToElement(turnRefs.current.get(revealing) ?? null)
  }, [revealing])

  const play = async (input: string) => {
    const text = input.trim()
    if (!text || writing || ended) return
    setPending({ input: text, error: null })
    setDraft("")
    try {
      const played = await api.playTurn(session.id, { input: text })
      setPending(null)
      setRevealing(played.turn.id)
      setAnnouncement(played.turn.passage)
      onChange({
        ...data,
        session: played.session,
        turns: [...turns, played.turn],
      })
    } catch (error) {
      const failure = asApiError(error, "The Turn did not finish. Try again.")
      // A Turn another tab played first: reload to show it, and keep the input.
      if (failure.status === 409) {
        setPending(null)
        setDraft(text)
        const fresh = await api.getSession(session.id).catch(() => null)
        if (fresh) onChange(fresh)
        setAnnouncement(failure.message)
        return
      }
      setPending({ input: text, error: failure })
    }
  }

  const retryPending = () => {
    if (pending) void play(pending.input)
  }

  const editPending = () => {
    if (!pending) return
    setDraft(pending.input)
    setPending(null)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  const startAnother = async () => {
    if (restarting === "busy") return
    setRestarting("busy")
    try {
      const started = await api.startSession({ worldId: session.worldId })
      router.push(sessionHref(started.session.id))
    } catch (error) {
      setRestarting(
        asApiError(error, "The new Session did not start. Try again.")
      )
    }
  }

  // Choices by number, outside the input.
  const choices = !ended && !writing && revealing === null ? latest.choices : []
  React.useEffect(() => {
    if (choices.length === 0) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return
      if (isTypingTarget(event.target)) return
      const index = Number(event.key) - 1
      if (Number.isInteger(index) && index >= 0 && index < choices.length) {
        event.preventDefault()
        void play(choices[index])
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  })

  return (
    <div className="flex flex-1 flex-col">
      <ShellBreadcrumbs items={worldCrumbs(world, { session: "Session" })} />
      <ShellActions>
        <Field orientation="horizontal" className="w-auto">
          <Switch
            id="harness-switch"
            checked={harnessOn}
            onCheckedChange={(on) => {
              setHarnessOn(on)
              if (!on) setHarnessOpen(false)
            }}
          />
          <FieldLabel htmlFor="harness-switch" className="whitespace-nowrap">
            Harness pane
          </FieldLabel>
        </Field>
        {harnessOn ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  onClick={() => setHarnessOpen((o) => !o)}
                  aria-keyshortcuts={HARNESS_SHORTCUT}
                  aria-expanded={harnessOpen}
                />
              }
            >
              <FlaskConicalIcon data-icon="inline-start" aria-hidden />
              Harness
            </TooltipTrigger>
            <TooltipContent>
              What the Writer saw and sent back
              <ShortcutKeys shortcut={HARNESS_SHORTCUT} />
            </TooltipContent>
          </Tooltip>
        ) : null}
      </ShellActions>

      <Sheet open={harnessOn && harnessOpen} onOpenChange={setHarnessOpen}>
        <SheetContent className="w-full overflow-y-auto data-[side=right]:sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Harness</SheetTitle>
            <SheetDescription>
              Each Turn&apos;s instructions, prompt and raw reply from the
              Writer, newest first.
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">
            <HarnessPane turns={turns} />
          </div>
        </SheetContent>
      </Sheet>

      <article
        aria-label={sessionLabel}
        className={cn(PROSE, "flex flex-col gap-10 py-10")}
      >
        {turns.map((turn) => (
          <TurnSection
            key={turn.id}
            turn={turn}
            matchers={matchers}
            revealing={revealing === turn.id}
            onRevealed={() => {
              setRevealing(null)
              inputRef.current?.focus({ preventScroll: true })
            }}
            ref={(element) => {
              if (element) turnRefs.current.set(turn.id, element)
              else turnRefs.current.delete(turn.id)
            }}
          />
        ))}

        {pending ? (
          <section aria-label="This Turn" className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              <span aria-hidden>› </span>
              <span className="sr-only">You: </span>
              {pending.input}
            </p>
            {pending.error ? (
              <Alert variant="destructive">
                <TriangleAlertIcon aria-hidden />
                <AlertTitle>The Turn did not finish</AlertTitle>
                <AlertDescription>{pending.error.message}</AlertDescription>
                <AlertAction className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={editPending}>
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={retryPending}
                    autoFocus
                  >
                    <RotateCcwIcon data-icon="inline-start" aria-hidden />
                    Retry
                  </Button>
                </AlertAction>
              </Alert>
            ) : (
              <p
                role="status"
                className="flex min-h-24 items-start gap-2 text-lg leading-8 text-muted-foreground"
              >
                <Spinner aria-hidden className="mt-2" />
                The Writer is writing…
              </p>
            )}
          </section>
        ) : null}

        {ended && revealing === null && session.ending ? (
          <EndingCard
            ending={session.ending}
            worldId={session.worldId}
            restarting={restarting}
            onStartAnother={() => void startAnother()}
          />
        ) : null}

        {ended ? null : (
          <div className="flex flex-col gap-3">
            {choices.length > 0 ? (
              <ol
                aria-label="Choices"
                className="flex animate-in flex-col gap-2 duration-200 fade-in-0 motion-reduce:animate-none"
              >
                {choices.map((choice, index) => (
                  <li key={choice}>
                    <Button
                      variant="outline"
                      className="h-auto w-full justify-start py-2 text-left whitespace-normal"
                      onClick={() => void play(choice)}
                      aria-keyshortcuts={String(index + 1)}
                    >
                      <Kbd aria-hidden>{index + 1}</Kbd>
                      {choice}
                    </Button>
                  </li>
                ))}
              </ol>
            ) : null}
            <Composer
              value={draft}
              onValueChange={setDraft}
              onSubmit={(text) => void play(text)}
              busy={writing || revealing !== null}
              placeholder={`Or write what ${playerName} does…`}
              inputRef={inputRef}
            />
          </div>
        )}
      </article>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  )
}

function TurnSection({
  turn,
  matchers,
  revealing,
  onRevealed,
  ref,
}: {
  turn: Turn
  matchers: PassageMatchers
  revealing: boolean
  onRevealed: () => void
  ref?: React.Ref<HTMLElement>
}) {
  return (
    <section
      ref={ref}
      aria-label={turnLabel(turn)}
      className="flex scroll-mt-24 flex-col gap-3"
    >
      {turn.playerInput === null ? null : (
        <p className="text-sm text-muted-foreground">
          <span aria-hidden>› </span>
          <span className="sr-only">You: </span>
          {turn.playerInput}
        </p>
      )}
      <div className="text-lg leading-8 text-pretty">
        {revealing ? (
          <PassageReveal text={turn.passage} onDone={onRevealed} />
        ) : (
          <PassageText
            passage={turn.passage}
            matchers={matchers}
            known={turn.known}
          />
        )}
      </div>
    </section>
  )
}

/**
 * Reveals a Passage word by word. Click, Space or Escape completes it at
 * once; under reduced motion it is instant. Screen readers get the whole
 * Passage from the page's live region instead.
 */
function PassageReveal({ text, onDone }: { text: string; onDone: () => void }) {
  const [instant, setInstant] = React.useState(false)

  React.useEffect(() => {
    if (instant) return
    function onKeyDown(event: KeyboardEvent) {
      if (
        event.key === "Escape" ||
        (event.key === " " && !isTypingTarget(event.target))
      ) {
        if (event.key === " ") event.preventDefault()
        setInstant(true)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [instant])

  return (
    <span
      aria-hidden
      onClick={() => setInstant(true)}
      className={cn(!instant && "cursor-pointer")}
    >
      <TextGenerateEffect
        words={text}
        stagger={0.03}
        duration={0.4}
        instant={instant}
        onComplete={onDone}
      />
    </span>
  )
}

function Composer({
  value,
  onValueChange,
  onSubmit,
  busy,
  placeholder,
  inputRef,
}: {
  value: string
  onValueChange: (value: string) => void
  onSubmit: (text: string) => void
  busy: boolean
  placeholder: string
  inputRef: React.RefObject<HTMLTextAreaElement | null>
}) {
  const canSend = !busy && value.trim().length > 0
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (canSend) onSubmit(value)
      }}
    >
      <InputGroup>
        <InputGroupTextarea
          ref={inputRef}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault()
              if (canSend) onSubmit(value)
            }
          }}
          placeholder={placeholder}
          aria-label="Your action"
          maxLength={2_000}
          rows={2}
          className="text-base"
        />
        <InputGroupAddon align="block-end" className="justify-between">
          <span className="text-xs text-muted-foreground">
            <Kbd>Enter</Kbd> to send, <Kbd>Shift</Kbd> <Kbd>Enter</Kbd> for a
            new line
          </span>
          <InputGroupButton
            type="submit"
            variant="default"
            size="icon-sm"
            disabled={!canSend}
            aria-label="Send"
          >
            <ArrowUpIcon />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </form>
  )
}

function EndingCard({
  ending,
  worldId,
  restarting,
  onStartAnother,
}: {
  ending: NonNullable<GetSessionResponse["session"]["ending"]>
  worldId: string
  restarting: ApiError | "busy" | null
  onStartAnother: () => void
}) {
  const headingRef = React.useRef<HTMLHeadingElement>(null)
  React.useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
    scrollToElement(headingRef.current)
  }, [])
  return (
    <section
      aria-labelledby="ending-title"
      className="flex animate-in flex-col items-start gap-4 rounded-xl border p-6 duration-300 fade-in-0 motion-reduce:animate-none"
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <FlagIcon className="size-4" aria-hidden />
        The story has ended
      </div>
      <h2
        id="ending-title"
        ref={headingRef}
        tabIndex={-1}
        className="font-heading text-2xl font-semibold tracking-tight outline-none"
      >
        {ending.name}
      </h2>
      <div className="flex gap-2">
        <Badge variant="secondary">
          {ending.kind[0].toUpperCase() + ending.kind.slice(1)} ending
        </Badge>
        {ending.invented ? (
          <Badge variant="outline">Invented by the Writer</Badge>
        ) : null}
      </div>
      {restarting instanceof ApiError ? (
        <Alert variant="destructive">
          <TriangleAlertIcon aria-hidden />
          <AlertTitle>The new Session did not start</AlertTitle>
          <AlertDescription>{restarting.message}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button onClick={onStartAnother} disabled={restarting === "busy"}>
          {restarting === "busy" ? (
            <Spinner data-icon="inline-start" aria-hidden />
          ) : null}
          {restarting === "busy" ? "Writing the Opening…" : "Play again"}
        </Button>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={worldHref(worldId)} />}
        >
          Back to the World
        </Button>
      </div>
    </section>
  )
}

function StorySkeleton() {
  return (
    <div
      className={cn(PROSE, "flex flex-col gap-10 py-10")}
      aria-busy="true"
      aria-label="Loading the Session"
    >
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
