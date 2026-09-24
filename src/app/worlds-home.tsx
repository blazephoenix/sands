"use client"

/**
 * The Worlds home: every World with its setup status, when it last
 * changed and how many Sessions it has, and "New World", which creates a World
 * and opens its Brief.
 *
 * States: loading (Skeleton rows), empty, error (with Retry), list.
 */
import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ChevronRightIcon,
  GlobeIcon,
  PlusIcon,
  TriangleAlertIcon,
} from "lucide-react"

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
import { SetupStatusBadge } from "@/components/worlds/setup-status-badge"
import { briefHref, worldHref } from "@/components/worlds/world-links"
import type { WorldSummary } from "@/domain/api"
import { api, ApiError, isAbortError } from "@/lib/api-client"
import { useSingleKeyShortcut } from "@/lib/keyboard"

const NEW_WORLD_SHORTCUT = "n"

type Load =
  | { state: "loading" }
  | { state: "error"; error: ApiError }
  | { state: "ready"; worlds: WorldSummary[] }

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
        <Empty className="flex-none border py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <GlobeIcon />
            </EmptyMedia>
            <EmptyTitle>No Worlds yet</EmptyTitle>
            <EmptyDescription>
              Start with a Brief: who is in the story, where it happens and how
              it ends.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>{newWorldButton()}</EmptyContent>
        </Empty>
      ) : null}

      {load.state === "ready" && !isEmpty ? (
        <WorldList worlds={load.worlds} />
      ) : null}
    </div>
  )
}

function WorldList({ worlds }: { worlds: WorldSummary[] }) {
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
            <Item variant="outline" render={<Link href={worldHref(world)} />}>
              <ItemContent className="min-w-0">
                <ItemTitle
                  className={world.name ? undefined : "text-muted-foreground"}
                >
                  {world.name || "Untitled World"}
                </ItemTitle>
                <ItemDescription>
                  <time
                    dateTime={world.updatedAt}
                    title={new Date(world.updatedAt).toLocaleString()}
                  >
                    Updated {relativeTime(world.updatedAt, now)}
                  </time>
                  {" · "}
                  {world.sessionCount === 1
                    ? "1 Session"
                    : `${world.sessionCount} Sessions`}
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <SetupStatusBadge status={world.setupStatus} />
                <ChevronRightIcon
                  className="text-muted-foreground"
                  aria-hidden
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
  const [now, setNow] = React.useState(() => Date.now())
  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])
  return now
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60 * 1000],
  ["month", 30 * 24 * 60 * 60 * 1000],
  ["week", 7 * 24 * 60 * 60 * 1000],
  ["day", 24 * 60 * 60 * 1000],
  ["hour", 60 * 60 * 1000],
  ["minute", 60 * 1000],
]

function relativeTime(iso: string, now: number) {
  const diff = Date.parse(iso) - now
  const format = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" })
  for (const [unit, ms] of RELATIVE_UNITS) {
    if (Math.abs(diff) >= ms) return format.format(Math.round(diff / ms), unit)
  }
  return "just now"
}
