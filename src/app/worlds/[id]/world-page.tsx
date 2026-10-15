"use client"

/**
 * The World page: the World's Sessions, New Session to start another, Edit
 * Skeleton and the Story map. While the Skeleton has issues that block play, New Session
 * is disabled and the page lists what to fix.
 *
 * States: loading (Skeleton rows), not found, error with Retry, no Sessions
 * yet, list.
 *
 * The header's World actions menu holds "Delete World". After a delete the
 * Author lands on the Worlds home, with focus on its list (or its Empty
 * state) and a toast saying what was deleted.
 */
import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  CircleAlertIcon,
  GitBranchIcon,
  PencilIcon,
  PlayIcon,
  SearchXIcon,
  TriangleAlertIcon,
} from "lucide-react"

import { returnHomeAfterDelete } from "@/app/worlds-home-focus"
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
  DeleteWorldDialog,
  WorldActionsMenu,
} from "@/components/worlds/delete-world"
import {
  sessionHref,
  skeletonHref,
  storyMapHref,
} from "@/components/worlds/world-links"
import type { GetWorldResponse } from "@/domain/api"
import { worldDisplayName } from "@/domain/world"
import { api, ApiError, isAbortError } from "@/lib/api-client"
import { useSingleKeyShortcut } from "@/lib/keyboard"
import type { SkeletonIssue } from "@/skeleton/check"
import { plainText } from "@/skeleton/hidden-text"

import { isRowSection, issueTarget } from "./skeleton/sections"

import { WorldSessions, WorldSessionsSkeleton } from "./world-sessions"

const NEW_SESSION_SHORTCUT = "n"
const EDIT_SKELETON_SHORTCUT = "e"
const STORY_MAP_SHORTCUT = "m"
/** Enough issues to start fixing; the editor shows every one. */
const ISSUES_SHOWN = 5

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

  const retry = () => {
    setLoad({ state: "loading" })
    setAttempt((n) => n + 1)
  }

  if (load.state === "loading") return <WorldPageSkeleton />
  if (load.state === "error")
    return <LoadError error={load.error} onRetry={retry} />
  return <LoadedWorld data={load.data} />
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
            <Button nativeButton={false} render={<Link href={"/"} />}>
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

/** The Skeleton editor, open where an issue is. */
function issueHref(world: GetWorldResponse["world"], issue: SkeletonIssue) {
  const { section, row } = issueTarget(issue)
  const search = new URLSearchParams({ section })
  if (row !== null && isRowSection(section)) {
    const id = world.document[section][row]?.id
    if (id) search.set("row", id)
  }
  return `${skeletonHref(world.id)}?${search}`
}

function LoadedWorld({ data }: { data: GetWorldResponse }) {
  const { world, sessions } = data
  const blocking = data.issues.filter((issue) => issue.blocksPlay)
  const playable = blocking.length === 0
  const premise = plainText(world.skeleton.story.premise).trim()
  const router = useRouter()
  const [starting, setStarting] = React.useState(false)
  const [startError, setStartError] = React.useState<ApiError | null>(null)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const menuButton = React.useRef<HTMLButtonElement>(null)
  const name = worldDisplayName(world.name)
  const deletable = { ...world, sessionCount: sessions.length }

  const onDeleted = () => {
    setDeleteOpen(false)
    returnHomeAfterDelete(router, world)
  }

  const startSession = React.useCallback(async () => {
    if (starting || !playable) return
    setStarting(true)
    setStartError(null)
    try {
      const { session } = await api.startSession({ worldId: world.id })
      // Stays busy until the Session page takes over.
      router.push(sessionHref(session.id))
    } catch (error) {
      setStartError(asApiError(error, "The Session did not start. Try again."))
      setStarting(false)
    }
  }, [playable, router, starting, world.id])

  useSingleKeyShortcut(NEW_SESSION_SHORTCUT, (event) => {
    event.preventDefault()
    void startSession()
  })
  useSingleKeyShortcut(EDIT_SKELETON_SHORTCUT, (event) => {
    event.preventDefault()
    router.push(skeletonHref(world.id))
  })
  useSingleKeyShortcut(STORY_MAP_SHORTCUT, (event) => {
    event.preventDefault()
    router.push(storyMapHref(world.id))
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
                variant="outline"
                nativeButton={false}
                render={<Link href={skeletonHref(world.id)} />}
                aria-keyshortcuts={EDIT_SKELETON_SHORTCUT}
              />
            }
          >
            <PencilIcon data-icon="inline-start" aria-hidden />
            Edit Skeleton
          </TooltipTrigger>
          <TooltipContent>
            Open the Skeleton editor
            <ShortcutKeys shortcut={EDIT_SKELETON_SHORTCUT} />
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href={storyMapHref(world.id)} />}
                aria-keyshortcuts={STORY_MAP_SHORTCUT}
              />
            }
          >
            <GitBranchIcon data-icon="inline-start" aria-hidden />
            Story map
          </TooltipTrigger>
          <TooltipContent>
            See the Arcs and where each Ending forks off
            <ShortcutKeys shortcut={STORY_MAP_SHORTCUT} />
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          {/* A wrapper, so the tooltip still explains a disabled button. */}
          <TooltipTrigger render={<span className="inline-flex" />}>
            <Button
              onClick={() => void startSession()}
              disabled={starting || !playable}
              aria-keyshortcuts={NEW_SESSION_SHORTCUT}
            >
              {busyIcon}
              {starting ? "Writing the Opening…" : "New Session"}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {playable ? (
              <>
                Start a Session in this World
                <ShortcutKeys shortcut={NEW_SESSION_SHORTCUT} />
              </>
            ) : (
              "Fix the Skeleton's issues first"
            )}
          </TooltipContent>
        </Tooltip>
        <WorldActionsMenu
          world={deletable}
          onDelete={() => setDeleteOpen(true)}
          triggerRef={menuButton}
        />
      </ShellActions>
      <DeleteWorldDialog
        world={deletable}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={onDeleted}
        returnFocus={() => menuButton.current}
      />

      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {name}
        </h1>
        {premise ? (
          <p className="max-w-prose leading-relaxed text-muted-foreground">
            {premise}
          </p>
        ) : null}
      </div>

      {playable ? null : (
        <Alert>
          <CircleAlertIcon aria-hidden />
          <AlertTitle>Not playable yet</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4">
              {blocking.slice(0, ISSUES_SHOWN).map((issue) => (
                <li key={`${issue.path}-${issue.message}`}>
                  <Link
                    href={issueHref(world, issue)}
                    className="underline-offset-4 hover:underline"
                  >
                    {issue.message}
                  </Link>
                </li>
              ))}
            </ul>
            {blocking.length > ISSUES_SHOWN ? (
              <p>
                {blocking.length - ISSUES_SHOWN} more in the Skeleton editor.
              </p>
            ) : null}
          </AlertDescription>
          <AlertAction>
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={skeletonHref(world.id)} />}
            >
              Edit Skeleton
            </Button>
          </AlertAction>
        </Alert>
      )}

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
          {playable ? (
            <EmptyContent>
              <Button onClick={() => void startSession()} disabled={starting}>
                {busyIcon}
                {starting ? "Writing the Opening…" : "Start the first Session"}
              </Button>
            </EmptyContent>
          ) : null}
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
