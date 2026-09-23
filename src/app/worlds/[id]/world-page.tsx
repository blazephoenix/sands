"use client"

/**
 * The World page (ticket 05): a playable World opens to its Sessions, with
 * New Session to start another. Setup is behind a ready World, so the setup
 * review is not shown here. A World that is not ready yet is sent where it
 * belongs: its Brief while in draft or drafting, the setup review in review.
 *
 * States: loading (Skeleton rows; also while sending the Author on), not
 * found, error with Retry (`?scenario=request-error`), no Sessions yet, list.
 */
import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { PlayIcon, SearchXIcon, TriangleAlertIcon } from "lucide-react"

import { ShellActions, ShellBreadcrumbs } from "@/components/app-shell"
import { ShortcutKeys } from "@/components/shortcut-keys"
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  sessionHref,
  withScenario,
  worldHref,
} from "@/components/worlds/world-links"
import type { GetWorldResponse } from "@/domain/api"
import { api, ApiError, isAbortError } from "@/lib/api-client"
import { useSingleKeyShortcut } from "@/lib/keyboard"

import { WorldSessions, WorldSessionsSkeleton } from "./world-sessions"

const NEW_SESSION_SHORTCUT = "n"

type Load =
  | { state: "loading" }
  | { state: "error"; error: ApiError }
  | { state: "ready"; data: GetWorldResponse }

function asApiError(error: unknown, fallback: string) {
  return error instanceof ApiError
    ? error
    : new ApiError(0, "internal", fallback)
}

export function WorldPage({ worldId }: { worldId: string }) {
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
          error: asApiError(error, "The World did not load. Try again."),
        })
      })
    return () => controller.abort()
  }, [worldId, attempt])

  // A World that isn't playable yet opens where the Author left off.
  const world = load.state === "ready" ? load.data.world : null
  const elsewhere =
    world && world.setupStatus !== "ready"
      ? withScenario(worldHref(world))
      : null
  React.useEffect(() => {
    if (elsewhere) router.replace(elsewhere)
  }, [elsewhere, router])

  const retry = () => {
    setLoad({ state: "loading" })
    setAttempt((n) => n + 1)
  }

  if (load.state === "loading" || elsewhere) return <WorldPageSkeleton />
  if (load.state === "error")
    return <LoadError error={load.error} onRetry={retry} />
  return <PlayableWorld data={load.data} />
}

function PageFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10">
      {children}
    </div>
  )
}

function WorldPageSkeleton() {
  return (
    <PageFrame>
      <div
        className="flex flex-col gap-2"
        aria-busy="true"
        aria-label="Loading the World"
      >
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-5 w-full max-w-md" />
      </div>
      <WorldSessionsSkeleton />
    </PageFrame>
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
      <PageFrame>
        <Empty className="flex-none border py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchXIcon />
            </EmptyMedia>
            <EmptyTitle>There is no World here</EmptyTitle>
            <EmptyDescription>{error.message}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              nativeButton={false}
              render={<Link href={withScenario("/")} />}
            >
              Go to your Worlds
            </Button>
          </EmptyContent>
        </Empty>
      </PageFrame>
    )
  }
  return (
    <PageFrame>
      <Alert variant="destructive">
        <TriangleAlertIcon aria-hidden />
        <AlertTitle>The World did not load</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
        <AlertAction>
          <Button variant="outline" size="sm" onClick={onRetry} autoFocus>
            Retry
          </Button>
        </AlertAction>
      </Alert>
    </PageFrame>
  )
}

function PlayableWorld({ data }: { data: GetWorldResponse }) {
  const { world, sessions } = data
  const router = useRouter()
  const [starting, setStarting] = React.useState(false)
  const [startError, setStartError] = React.useState<ApiError | null>(null)
  const name = world.name || "Untitled World"

  const startSession = React.useCallback(async () => {
    if (starting) return
    setStarting(true)
    setStartError(null)
    try {
      const { session } = await api.createSession({ worldId: world.id })
      // Stays busy until the Session page takes over; its Opening starts there.
      router.push(withScenario(sessionHref(session.id)))
    } catch (error) {
      setStartError(asApiError(error, "The Session did not start. Try again."))
      setStarting(false)
    }
  }, [router, starting, world.id])

  useSingleKeyShortcut(NEW_SESSION_SHORTCUT, (event) => {
    event.preventDefault()
    void startSession()
  })

  const busyIcon = starting ? (
    <Spinner data-icon="inline-start" aria-hidden />
  ) : (
    <PlayIcon data-icon="inline-start" aria-hidden />
  )

  return (
    <PageFrame>
      <ShellBreadcrumbs items={[{ label: name }]} />
      <ShellActions>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                onClick={() => void startSession()}
                disabled={starting}
                aria-keyshortcuts={NEW_SESSION_SHORTCUT}
              />
            }
          >
            {busyIcon}
            {starting ? "Starting…" : "New Session"}
          </TooltipTrigger>
          <TooltipContent>
            Start a Session in this World
            <ShortcutKeys shortcut={NEW_SESSION_SHORTCUT} />
          </TooltipContent>
        </Tooltip>
      </ShellActions>

      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {name}
        </h1>
        <p className="max-w-prose leading-relaxed text-muted-foreground">
          Every Session opens with its own first scene and plays its own copy of
          this World&apos;s Entries.
        </p>
      </div>

      {startError ? (
        <Alert variant="destructive">
          <TriangleAlertIcon aria-hidden />
          <AlertTitle>The Session did not start</AlertTitle>
          <AlertDescription>{startError.message}</AlertDescription>
          <AlertAction>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void startSession()}
              disabled={starting}
            >
              Retry
            </Button>
          </AlertAction>
        </Alert>
      ) : null}

      {sessions.length === 0 ? (
        <Empty className="flex-none border py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <PlayIcon />
            </EmptyMedia>
            <EmptyTitle>No Sessions yet</EmptyTitle>
            <EmptyDescription>
              Each Session is one playthrough of this World, from its Opening to
              its Ending.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => void startSession()} disabled={starting}>
              {busyIcon}
              Start the first Session
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <section
          aria-labelledby="world-sessions-title"
          className="flex flex-col gap-3"
        >
          <h2
            id="world-sessions-title"
            className="text-sm font-medium text-muted-foreground"
          >
            Sessions
          </h2>
          <WorldSessions sessions={sessions} />
        </section>
      )}
    </PageFrame>
  )
}
