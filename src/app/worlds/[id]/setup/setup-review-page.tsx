"use client"

/**
 * The setup review (the Author's design from the prototype on
 * `prototype/ui-decisions`, variant E): a sidebar of what setup drafted, one
 * Entry card at a time with Approve / Edit / Remove, the solvability banner,
 * and Start Session once the World is solvable.
 *
 * Page guards by setup status: `draft` points back to the Brief, `drafting`
 * waits for setup, `review` shows the review. Setup is behind a `ready`
 * World, so it goes to the World page and its Sessions instead.
 */
import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  CheckCheckIcon,
  CircleCheckBigIcon,
  FileTextIcon,
  PlayIcon,
  SearchXIcon,
  TriangleAlertIcon,
} from "lucide-react"

import {
  ShellActions,
  ShellBreadcrumbs,
  worldCrumbs,
} from "@/components/app-shell"
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { GetWorldResponse } from "@/domain/api"
import type { World } from "@/domain/world"
import { api, ApiError, isAbortError } from "@/lib/api-client"
import { isTypingTarget } from "@/lib/keyboard"
import {
  nextUndecided,
  reviewDecision,
  reviewProgress,
  reviewSections,
  sidebarOrder,
  whyDrafted,
} from "@/setup/review"

import { EntryCard } from "./entry-card"
import { REVIEW_ROW_ATTR, ReviewSidebar } from "./review-sidebar"
import {
  briefHref,
  sessionHref,
  worldPageHref,
} from "@/components/worlds/world-links"
import { SolvabilityBanner } from "./solvability-banner"
import {
  errorMessage,
  useSetupReview,
  type ReviewAction,
} from "./use-setup-review"

type Load =
  | { state: "loading" }
  | { state: "error"; error: ApiError }
  | { state: "ready"; data: GetWorldResponse }

const DRAFTING_POLL_MS = 4000

export function SetupReviewPage({ worldId }: { worldId: string }) {
  const router = useRouter()
  const [load, setLoad] = React.useState<Load>({ state: "loading" })
  const [attempt, setAttempt] = React.useState(0)

  React.useEffect(() => {
    const controller = new AbortController()
    api
      .getWorld(worldId, controller.signal)
      .then((data) => setLoad({ state: "ready", data }))
      .catch((error: unknown) => {
        if (isAbortError(error)) return
        setLoad({
          state: "error",
          error:
            error instanceof ApiError
              ? error
              : new ApiError(
                  0,
                  "internal",
                  "The World did not load. Try again."
                ),
        })
      })
    return () => controller.abort()
  }, [worldId, attempt])

  // A ready World is played, not reviewed: its page lists its Sessions.
  const ready =
    load.state === "ready" && load.data.world.setupStatus === "ready"
  React.useEffect(() => {
    if (ready) router.replace(worldPageHref(worldId))
  }, [ready, router, worldId])

  const retry = () => {
    setLoad({ state: "loading" })
    setAttempt((n) => n + 1)
  }

  if (load.state === "loading" || ready) return <ReviewSkeleton />
  if (load.state === "error")
    return <LoadError error={load.error} onRetry={retry} />

  const { world } = load.data
  return (
    <>
      <ShellBreadcrumbs items={worldCrumbs(world, "Setup")} />
      {world.setupStatus === "draft" ? (
        <DraftState world={world} />
      ) : world.setupStatus === "drafting" ? (
        <DraftingState
          world={world}
          onDone={(data) => setLoad({ state: "ready", data })}
        />
      ) : (
        <ReviewWorkspace key={world.id} initial={load.data} />
      )}
    </>
  )
}

// Guards and load states

function ReviewSkeleton() {
  return (
    <div
      className="grid flex-1 grid-cols-1 md:grid-cols-[18rem_minmax(0,1fr)]"
      aria-busy="true"
      aria-label="Loading the setup review"
    >
      <div className="flex flex-col gap-3 border-b p-5 md:border-r md:border-b-0">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-1 w-full" />
        {Array.from({ length: 9 }, (_, index) => (
          <Skeleton key={index} className="h-6 w-full" />
        ))}
      </div>
      <div className="px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto flex max-w-2xl flex-col gap-6">
          <Skeleton className="h-7 w-72" />
          <Skeleton className="h-16 w-full" />
          <div className="flex flex-col gap-3 rounded-xl border p-6">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="mt-2 h-8 w-72" />
          </div>
        </div>
      </div>
    </div>
  )
}

function LoadError({
  error,
  onRetry,
}: {
  error: ApiError
  onRetry: () => void
}) {
  if (error.status === 404) {
    return (
      <Empty className="py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SearchXIcon />
          </EmptyMedia>
          <EmptyTitle>There is no World here</EmptyTitle>
          <EmptyDescription>{error.message}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button nativeButton={false} render={<Link href={"/"} />}>
            Go to your Worlds
          </Button>
        </EmptyContent>
      </Empty>
    )
  }
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <Alert variant="destructive">
        <TriangleAlertIcon aria-hidden />
        <AlertTitle>The setup review did not load</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
        <AlertAction>
          <Button variant="outline" size="sm" onClick={onRetry} autoFocus>
            Retry
          </Button>
        </AlertAction>
      </Alert>
    </div>
  )
}

function DraftState({ world }: { world: World }) {
  return (
    <Empty className="py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FileTextIcon />
        </EmptyMedia>
        <EmptyTitle>Setup hasn&apos;t run for this World yet</EmptyTitle>
        <EmptyDescription>
          Finish the Brief and run setup. What setup drafts from it is reviewed
          here.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button
          nativeButton={false}
          render={<Link href={briefHref(world.id)} />}
          autoFocus
        >
          Back to the Brief
        </Button>
      </EmptyContent>
    </Empty>
  )
}

/** Setup is running: wait for it, checking the World now and then, and open the review when it's done. */
function DraftingState({
  world,
  onDone,
}: {
  world: World
  onDone: (data: GetWorldResponse) => void
}) {
  const onDoneRef = React.useRef(onDone)
  React.useEffect(() => {
    onDoneRef.current = onDone
  })
  React.useEffect(() => {
    const controller = new AbortController()
    const timer = window.setInterval(() => {
      api
        .getWorld(world.id, controller.signal)
        .then((data) => {
          if (data.world.setupStatus !== "drafting") onDoneRef.current(data)
        })
        .catch(() => {
          // Keep waiting; the next check tries again.
        })
    }, DRAFTING_POLL_MS)
    return () => {
      window.clearInterval(timer)
      controller.abort()
    }
  }, [world.id])

  return (
    <Empty className="py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Spinner />
        </EmptyMedia>
        <EmptyTitle role="status">Setup is drafting this World</EmptyTitle>
        <EmptyDescription>
          It drafts Locations, NPCs, Clues and the Story logic from the Brief,
          then checks them. That takes about a minute; the review opens here
          when it&apos;s done.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={briefHref(world.id)} />}
        >
          Watch setup on the Brief page
        </Button>
      </EmptyContent>
    </Empty>
  )
}

// The review

function rowElement(entryId: string) {
  return document.querySelector<HTMLElement>(
    `[${REVIEW_ROW_ATTR}="${CSS.escape(entryId)}"]`
  )
}

function focusIsInSidebarOrNowhere() {
  const active = document.activeElement
  return (
    !active ||
    active === document.body ||
    !!active.closest(`[${REVIEW_ROW_ATTR}]`)
  )
}

function ReviewWorkspace({ initial }: { initial: GetWorldResponse }) {
  const { world } = initial
  const router = useRouter()
  const [selectedId, setSelectedId] = React.useState<string | null>(() =>
    nextUndecided(initial.entries, null)
  )
  const [editing, setEditing] = React.useState(false)
  const [starting, setStarting] = React.useState(false)
  const [solvabilityNews, setSolvabilityNews] = React.useState("")
  /** Move focus to the selected row after the next selection (keyboard use in the sidebar). */
  const focusRow = React.useRef(true)
  const editButton = React.useRef<HTMLButtonElement>(null)

  const select = React.useCallback(
    (entryId: string | null, options: { focus?: boolean } = {}) => {
      focusRow.current = options.focus ?? focusIsInSidebarOrNowhere()
      setSelectedId(entryId)
      setEditing(false)
    },
    []
  )

  const review = useSetupReview(initial, {
    select: (entryId) => select(entryId),
  })
  const sections = React.useMemo(
    () => reviewSections(review.entries),
    [review.entries]
  )
  const order = React.useMemo(() => sidebarOrder(sections), [sections])
  const progress = React.useMemo(
    () => reviewProgress(review.entries),
    [review.entries]
  )
  const selected = order.find((entry) => entry.id === selectedId) ?? null
  const why = React.useMemo(
    () =>
      selected
        ? whyDrafted(selected, { entries: review.entries, brief: world.brief })
        : null,
    [selected, review.entries, world.brief]
  )
  const canSelect = React.useCallback(
    (entryId: string) => order.some((entry) => entry.id === entryId),
    [order]
  )

  const decide = React.useCallback(
    (action: ReviewAction) => {
      if (!selected) return
      review.decide(selected.id, action)
      // After a decision the card moves on; Restore keeps the Entry in view to act on it.
      if (action !== "restore")
        select(nextUndecided(review.entries, selected.id))
    },
    [review, select, selected]
  )

  const move = React.useCallback(
    (delta: 1 | -1) => {
      if (order.length === 0) return
      const index = order.findIndex((entry) => entry.id === selectedId)
      const next =
        index === -1
          ? delta === 1
            ? 0
            : order.length - 1
          : Math.min(order.length - 1, Math.max(0, index + delta))
      select(order[next].id)
    },
    [order, select, selectedId]
  )

  // Single-key shortcuts: ↑ ↓ ↵ ⌫ E. Never while editing or typing, or inside a menu or dialog.
  const keys = React.useRef({ decide, move, selected, editing })
  React.useEffect(() => {
    keys.current = { decide, move, selected, editing }
  })
  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const { decide, move, selected, editing } = keys.current
      if (
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        editing
      )
        return
      if (isTypingTarget(event.target)) return
      const target = event.target instanceof Element ? event.target : null
      if (
        target?.closest(
          '[role="menu"], [role="dialog"], [role="alertdialog"], [role="listbox"], [data-slot="toast"]'
        )
      )
        return
      const onRow = !!target?.closest(`[${REVIEW_ROW_ATTR}]`)
      const onControl = !!target?.closest("button, a, summary, [role='button']")
      switch (event.key) {
        case "ArrowDown":
          move(1)
          break
        case "ArrowUp":
          move(-1)
          break
        case "Enter":
          // A focused button or link keeps its own Enter.
          if ((onControl && !onRow) || !selected || event.repeat) return
          decide("approve")
          break
        case "Backspace":
        case "Delete":
          if (!selected || event.repeat) return
          decide(
            reviewDecision(selected.status) === "removed" ? "restore" : "remove"
          )
          break
        case "e":
        case "E":
          if (!selected || reviewDecision(selected.status) === "removed") return
          setEditing(true)
          break
        default:
          return
      }
      event.preventDefault()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [])

  // Keep the selected row in view, and focus it when the Author is working from the sidebar.
  React.useEffect(() => {
    if (!selectedId) return
    const row = rowElement(selectedId)
    if (!row) return
    row.scrollIntoView({ block: "nearest" })
    if (focusRow.current) row.focus({ preventScroll: true })
  }, [selectedId, sections])

  // Leaving Edit puts focus back on the Edit button.
  const wasEditing = React.useRef(false)
  React.useEffect(() => {
    if (wasEditing.current && !editing) editButton.current?.focus()
    wasEditing.current = editing
  }, [editing])

  // Announce solvability when it changes.
  const lastPassed = React.useRef(review.solvability?.passed)
  React.useEffect(() => {
    const passed = review.solvability?.passed
    if (passed === lastPassed.current) return
    lastPassed.current = passed
    const gaps = review.solvability?.gaps.length ?? 0
    setSolvabilityNews(
      passed
        ? "The World is solvable again."
        : `The World can't be solved yet: ${gaps} ${gaps === 1 ? "gap" : "gaps"}.`
    )
  }, [review.solvability])

  const startBlocked = !review.solvability?.passed
    ? "Fix the gaps in the solvability banner first."
    : editing
      ? "Finish editing first."
      : review.saving
        ? "Saving your changes…"
        : null

  const start = async () => {
    if (startBlocked || starting) return
    setStarting(true)
    try {
      const sessionId = await review.startSession()
      router.push(sessionHref(sessionId))
    } catch (error) {
      setStarting(false)
      toast.add({
        title: "Couldn't start a Session",
        description: `${errorMessage(error)} Your review is unchanged.`,
        type: "error",
        priority: "high",
      })
    }
  }

  const startButton = (size: "sm" | "default") => (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            size={size}
            onClick={start}
            disabled={!!startBlocked || starting}
            focusableWhenDisabled
            className="data-disabled:opacity-50"
            aria-describedby={startBlocked ? "start-blocked" : undefined}
          />
        }
      >
        {starting ? (
          <Spinner data-icon="inline-start" />
        ) : (
          <PlayIcon data-icon="inline-start" aria-hidden />
        )}
        Start Session
      </TooltipTrigger>
      <TooltipContent>
        {startBlocked ??
          "Start playing this World. The Session gets its own copy of every Entry that isn't removed."}
      </TooltipContent>
    </Tooltip>
  )

  return (
    <>
      <ShellActions>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void review.approveRest()
                  select(null)
                }}
                disabled={
                  progress.undecided === 0 || review.approvingRest || editing
                }
                focusableWhenDisabled
                // Stays focusable so its tooltip can say why; dim it like any disabled button.
                className="data-disabled:opacity-50"
              />
            }
          >
            {review.approvingRest ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <CheckCheckIcon data-icon="inline-start" aria-hidden />
            )}
            {/* Icon-only on phones; the tooltip and accessible name keep the words. */}
            <span className="max-sm:sr-only">Approve the rest as drafted</span>
          </TooltipTrigger>
          <TooltipContent>
            {progress.undecided === 0
              ? "Nothing is left to review."
              : editing
                ? "Finish editing first."
                : `Approves the ${progress.undecided} ${progress.undecided === 1 ? "Entry" : "Entries"} you haven't reviewed, as setup drafted them. You can undo it.`}
          </TooltipContent>
        </Tooltip>
        {startButton("sm")}
      </ShellActions>
      <span id="start-blocked" className="sr-only">
        {startBlocked ?? ""}
      </span>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {review.announcement}
      </div>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {solvabilityNews}
      </div>

      <div className="grid flex-1 grid-cols-1 md:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="border-b max-md:max-h-80 max-md:overflow-y-auto md:sticky md:top-14 md:h-[calc(100svh-3.5rem)] md:overflow-y-auto md:border-r md:border-b-0">
          <ReviewSidebar
            sections={sections}
            progress={progress}
            selectedId={selected?.id ?? null}
            onSelect={(entryId) => select(entryId, { focus: true })}
          />
        </aside>

        <div className="px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto flex max-w-2xl flex-col gap-6">
            <div className="flex flex-col gap-1">
              <h1 className="font-heading text-xl font-semibold tracking-tight">
                Review what setup drafted
              </h1>
              <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
                Approve what fits your story, edit what&apos;s close, remove
                what doesn&apos;t. Entries you don&apos;t review stay in the
                World as drafted.
              </p>
            </div>

            <SolvabilityBanner
              solvability={review.solvability}
              canSelect={canSelect}
              onSelect={(entryId) => select(entryId, { focus: true })}
            />

            {selected ? (
              <EntryCard
                key={selected.id}
                entry={selected}
                entries={review.entries}
                why={why}
                editing={editing}
                onEditingChange={setEditing}
                onDecide={decide}
                onSave={review.saveEdit}
                onSelectEntry={(entryId) => {
                  if (!canSelect(entryId)) return false
                  select(entryId, { focus: true })
                  return true
                }}
                editButtonRef={editButton}
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <CircleCheckBigIcon aria-hidden />
                    {progress.undecided === 0
                      ? "Review finished"
                      : "Pick an Entry to review"}
                  </CardTitle>
                  <CardDescription className="max-w-prose leading-relaxed">
                    {progress.undecided === 0 ? (
                      <>
                        {progress.approved} approved and {progress.removed}{" "}
                        removed. Pick any Entry in the list to change your mind.
                      </>
                    ) : (
                      <>
                        {progress.undecided}{" "}
                        {progress.undecided === 1 ? "Entry is" : "Entries are"}{" "}
                        still to review. Pick one in the list, or press ↓.
                      </>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardFooter>{startButton("default")}</CardFooter>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
