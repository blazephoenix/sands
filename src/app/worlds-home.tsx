"use client"

/**
 * The Worlds home: every World with its setup status, when it last
 * changed and how many Sessions it has, and "New World", which creates a World
 * and opens its Brief. Each row has a World actions menu with "Delete World".
 *
 * States: loading (Skeleton rows), empty, error (with Retry), list.
 *
 * After a delete here the row goes and focus moves to the next row (the
 * previous one for the last row, the Empty state for the only one). After a
 * delete on the World page, focus lands on the first row or the Empty state.
 */
import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { GlobeIcon, PlusIcon, TriangleAlertIcon } from "lucide-react"

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
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  DeleteWorldDialog,
  takeWorldsHomeFocusRequest,
  WorldActionsMenu,
} from "@/components/worlds/delete-world"
import { worldDisplayName } from "@/components/worlds/delete-world-copy"
import { SetupStatusBadge } from "@/components/worlds/setup-status-badge"
import { briefHref, worldHref } from "@/components/worlds/world-links"
import type { WorldSummary } from "@/domain/api"
import { api, ApiError, isAbortError } from "@/lib/api-client"
import { useSingleKeyShortcut } from "@/lib/keyboard"
import { formatDateTime, fromNow, nowMs } from "@/lib/time"

const NEW_WORLD_SHORTCUT = "n"

type Load =
  | { state: "loading" }
  | { state: "error"; error: ApiError }
  | { state: "ready"; worlds: WorldSummary[] }

/** Where focus goes once the list has rendered after a delete. */
type FocusTarget = { world: string } | "empty"

function asApiError(error: unknown, fallback: string) {
  return error instanceof ApiError
    ? error
    : new ApiError(0, "internal", fallback)
}

export function WorldsHome() {
  const router = useRouter()
  const [load, setLoad] = React.useState<Load>({ state: "loading" })
  const [attempt, setAttempt] = React.useState(0)
  const [creating, setCreating] = React.useState(false)
  const [createError, setCreateError] = React.useState<ApiError | null>(null)

  const [deleteTarget, setDeleteTarget] = React.useState<WorldSummary | null>(
    null
  )
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [announcement, setAnnouncement] = React.useState("")
  // Stable for the page's life; rows register their link and menu button here.
  const [menuButtons] = React.useState(
    () => new Map<string, HTMLButtonElement>()
  )
  const [rowLinks] = React.useState(() => new Map<string, HTMLAnchorElement>())
  const emptyRef = React.useRef<HTMLDivElement>(null)
  const pendingFocus = React.useRef<FocusTarget | null>(null)

  React.useEffect(() => {
    const controller = new AbortController()
    api
      .listWorlds(controller.signal)
      .then(({ worlds }) => setLoad({ state: "ready", worlds }))
      .catch((error: unknown) => {
        if (isAbortError(error)) return
        setLoad({
          state: "error",
          error: asApiError(error, "The Worlds did not load. Try again."),
        })
      })
    return () => controller.abort()
  }, [attempt])

  // Focus after a delete, once the list (or the Empty state) has rendered.
  React.useEffect(() => {
    if (load.state !== "ready") return
    if (takeWorldsHomeFocusRequest()) {
      pendingFocus.current =
        load.worlds.length > 0 ? { world: load.worlds[0].id } : "empty"
    }
    const target = pendingFocus.current
    if (!target) return
    pendingFocus.current = null
    const element =
      target === "empty" ? emptyRef.current : rowLinks.get(target.world)
    element?.focus()
  }, [load, rowLinks])

  const openDelete = (world: WorldSummary) => {
    setDeleteTarget(world)
    setDeleteOpen(true)
  }

  const onDeleted = (deleted: { id: string; name: string }) => {
    if (load.state !== "ready") return
    const index = load.worlds.findIndex((world) => world.id === deleted.id)
    const rest = load.worlds.filter((world) => world.id !== deleted.id)
    const next = rest[Math.min(Math.max(index, 0), rest.length - 1)]
    pendingFocus.current = next ? { world: next.id } : "empty"
    setDeleteOpen(false)
    setLoad({ state: "ready", worlds: rest })
    setAnnouncement(`Deleted ${worldDisplayName(deleted.name)}.`)
  }

  const retryLoad = () => {
    setLoad({ state: "loading" })
    setAttempt((a) => a + 1)
  }

  const createWorld = React.useCallback(async () => {
    if (creating) return
    setCreating(true)
    setCreateError(null)
    try {
      const { world } = await api.createWorld()
      router.push(briefHref(world.id))
    } catch (error) {
      setCreateError(asApiError(error, "The World was not created. Try again."))
      setCreating(false)
    }
  }, [creating, router])

  useSingleKeyShortcut(NEW_WORLD_SHORTCUT, (event) => {
    event.preventDefault()
    void createWorld()
  })

  const newWorldButton = () => (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            onClick={() => void createWorld()}
            disabled={creating}
            aria-keyshortcuts="n"
          />
        }
      >
        {creating ? (
          <Spinner
            data-icon="inline-start"
            className="motion-reduce:animate-none"
            aria-hidden
          />
        ) : (
          <PlusIcon data-icon="inline-start" aria-hidden />
        )}
        {creating ? "Creating…" : "New World"}
      </TooltipTrigger>
      <TooltipContent>
        Create a World and write its Brief
        <ShortcutKeys shortcut={NEW_WORLD_SHORTCUT} />
      </TooltipContent>
    </Tooltip>
  )

  const isEmpty = load.state === "ready" && load.worlds.length === 0

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10">
      <ShellBreadcrumbs items={[{ label: "Worlds" }]} />
      {isEmpty ? null : <ShellActions>{newWorldButton()}</ShellActions>}

      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Worlds
        </h1>
        <p className="max-w-prose leading-relaxed text-muted-foreground">
          Write a Brief, review what setup drafts from it, and play Sessions in
          the World it becomes.
        </p>
      </div>

      {createError ? (
        <Alert variant="destructive">
          <TriangleAlertIcon aria-hidden />
          <AlertTitle>The World was not created</AlertTitle>
          <AlertDescription>{createError.message}</AlertDescription>
          <AlertAction>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void createWorld()}
              disabled={creating}
            >
              Retry
            </Button>
          </AlertAction>
        </Alert>
      ) : null}

      {load.state === "loading" ? <WorldListSkeleton /> : null}

      {load.state === "error" ? (
        <Alert variant="destructive">
          <TriangleAlertIcon aria-hidden />
          <AlertTitle>Your Worlds did not load</AlertTitle>
          <AlertDescription>{load.error.message}</AlertDescription>
          <AlertAction>
            <Button variant="outline" size="sm" onClick={retryLoad}>
              Retry
            </Button>
          </AlertAction>
        </Alert>
      ) : null}

      {isEmpty ? (
        <Empty
          ref={emptyRef}
          tabIndex={-1}
          aria-labelledby="worlds-empty-title"
          className="flex-none border py-12 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <GlobeIcon />
            </EmptyMedia>
            <EmptyTitle id="worlds-empty-title">No Worlds yet</EmptyTitle>
            <EmptyDescription>
              Start with a Brief: who is in the story, where it happens and how
              it ends.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>{newWorldButton()}</EmptyContent>
        </Empty>
      ) : null}

      {load.state === "ready" && !isEmpty ? (
        <WorldList
          worlds={load.worlds}
          onDelete={openDelete}
          menuButtons={menuButtons}
          rowLinks={rowLinks}
        />
      ) : null}

      <DeleteWorldDialog
        world={deleteTarget}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={onDeleted}
        returnFocus={() =>
          deleteTarget ? (menuButtons.get(deleteTarget.id) ?? null) : null
        }
      />
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  )
}

/** Registers an element under a World's id while it is mounted. */
function refIn<T>(map: Map<string, T>, id: string) {
  return (element: T | null) => {
    if (element) map.set(id, element)
    else map.delete(id)
  }
}

function WorldList({
  worlds,
  onDelete,
  menuButtons,
  rowLinks,
}: {
  worlds: WorldSummary[]
  onDelete: (world: WorldSummary) => void
  menuButtons: Map<string, HTMLButtonElement>
  rowLinks: Map<string, HTMLAnchorElement>
}) {
  const now = useNow()
  return (
    <section
      aria-labelledby="worlds-list-title"
      className="flex flex-col gap-3"
    >
      <h2 id="worlds-list-title" className="sr-only">
        Your Worlds
      </h2>
      <ItemGroup className="gap-2">
        {worlds.map((world) => (
          <div key={world.id} role="listitem">
            {/* The title link stretches over the row (its ::after), so the whole row opens the World; the menu button sits above it. */}
            <Item
              variant="outline"
              className="relative has-[a:focus-visible]:border-ring has-[a:focus-visible]:ring-[3px] has-[a:focus-visible]:ring-ring/50 has-[a:hover]:bg-muted"
            >
              <ItemContent className="min-w-0">
                <ItemTitle
                  className={world.name ? undefined : "text-muted-foreground"}
                >
                  <Link
                    ref={refIn(rowLinks, world.id)}
                    href={worldHref(world)}
                    className="outline-none after:absolute after:inset-0 after:rounded-lg"
                  >
                    {worldDisplayName(world.name)}
                  </Link>
                </ItemTitle>
                <ItemDescription>
                  <time
                    dateTime={world.updatedAt}
                    title={formatDateTime(world.updatedAt)}
                  >
                    Updated {fromNow(world.updatedAt, now)}
                  </time>
                  {" · "}
                  {world.sessionCount === 1
                    ? "1 Session"
                    : `${world.sessionCount} Sessions`}
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <SetupStatusBadge status={world.setupStatus} />
                <WorldActionsMenu
                  world={world}
                  onDelete={() => onDelete(world)}
                  triggerRef={refIn(menuButtons, world.id)}
                  className="relative"
                />
              </ItemActions>
            </Item>
          </div>
        ))}
      </ItemGroup>
    </section>
  )
}

function WorldListSkeleton() {
  return (
    <div
      className="flex flex-col gap-2"
      aria-busy="true"
      aria-label="Loading your Worlds"
    >
      {Array.from({ length: 4 }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5"
        >
          <div className="flex flex-1 flex-col gap-1">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-56" />
          </div>
          <Skeleton className="h-5 w-20 rounded-4xl" />
        </div>
      ))}
    </div>
  )
}

/** The current time, refreshed every minute, so "Updated 5 minutes ago" stays true. */
function useNow() {
  const [now, setNow] = React.useState(nowMs)
  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(nowMs()), 60_000)
    return () => window.clearInterval(timer)
  }, [])
  return now
}
