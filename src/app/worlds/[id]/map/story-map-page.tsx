"use client"

/**
 * The Story map: the World's Skeleton as a navigable diagram, with the
 * selected node in full in the detail pane on the right.
 *
 * States: loading (a Skeleton shaped like the map and pane), not found,
 * error with Retry, no Arcs (Empty, pointing at the editor's Arcs), the map
 * (with a callout when there are no Endings yet).
 */
import * as React from "react"
import Link from "next/link"
import { GitBranchIcon, SearchXIcon, TriangleAlertIcon } from "lucide-react"

import { ShellBreadcrumbs, worldCrumbs } from "@/components/app-shell"
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
import { skeletonHref } from "@/components/worlds/world-links"
import type { World } from "@/domain/world"
import { api, ApiError, isAbortError } from "@/lib/api-client"

import { DetailPane, FlagLegend } from "./detail-pane"
import { buildStoryMap, resolveNode, type NodeId } from "./model"
import { StoryMapDiagram } from "./story-map-diagram"

type Load =
  | { state: "loading" }
  | { state: "error"; error: ApiError }
  | { state: "ready"; world: World }

function asApiError(error: unknown, fallback: string) {
  return error instanceof ApiError
    ? error
    : new ApiError(0, "internal", fallback)
}

export function StoryMapPage({ worldId }: { worldId: string }) {
  const [load, setLoad] = React.useState<Load>({ state: "loading" })
  const [attempt, setAttempt] = React.useState(0)

  React.useEffect(() => {
    const controller = new AbortController()
    api
      .getWorld(worldId, controller.signal)
      .then(({ world }) => setLoad({ state: "ready", world }))
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

  return (
    <div className="flex w-full flex-1 flex-col lg:h-[calc(100svh-3.5rem-1px)] lg:flex-none">
      {load.state === "loading" ? (
        <MapSkeleton />
      ) : load.state === "error" ? (
        <LoadError error={load.error} onRetry={retry} />
      ) : (
        <>
          <ShellBreadcrumbs items={worldCrumbs(load.world, "Story map")} />
          <LoadedMap world={load.world} />
        </>
      )}
    </div>
  )
}

function MapSkeleton() {
  return (
    <div
      className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_26rem] lg:grid-rows-[minmax(0,1fr)]"
      aria-busy="true"
      aria-label="Loading the Story map"
    >
      <div className="flex flex-col items-center gap-6 p-8">
        <Skeleton className="h-14 w-40 rounded-full" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-10">
            <Skeleton className="h-23 w-60" />
            {i % 2 === 1 ? <Skeleton className="mt-11 h-17 w-50" /> : null}
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3 border-t p-6 lg:border-t-0 lg:border-l">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
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
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      {error.status === 404 ? (
        <Empty className="flex-none border py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchXIcon />
            </EmptyMedia>
            <EmptyTitle>There is no World here</EmptyTitle>
            <EmptyDescription>{error.message}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button nativeButton={false} render={<Link href="/" />}>
              Go to your Worlds
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
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
      )}
    </div>
  )
}

function LoadedMap({ world }: { world: World }) {
  const map = React.useMemo(() => buildStoryMap(world.skeleton), [world])
  const [chosen, setChosen] = React.useState<NodeId | null>("arc:0")
  // A selection the Skeleton no longer has falls back to nothing.
  const selected = chosen && resolveNode(map, chosen) ? chosen : null

  if (map.arcs.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <Empty className="flex-none border py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <GitBranchIcon />
            </EmptyMedia>
            <EmptyTitle>This Skeleton has no Arcs yet</EmptyTitle>
            <EmptyDescription>
              The Story map runs down the Arcs in story order, with the Endings
              forking off them. Add an Arc with a name and a Function to start
              it.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              nativeButton={false}
              render={<Link href={`${skeletonHref(world.id)}?section=arcs`} />}
            >
              Add Arcs in the Skeleton editor
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    )
  }

  return (
    <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_26rem] lg:grid-rows-[minmax(0,1fr)]">
      <div className="flex min-h-0 min-w-0 flex-col">
        {map.endings.length === 0 ? (
          <Alert className="mx-4 mt-3 w-auto">
            <GitBranchIcon aria-hidden />
            <AlertTitle>No Endings yet, so nothing forks</AlertTitle>
            <AlertDescription>
              Each Ending forks off the Arcs at its Earliest Arc.
            </AlertDescription>
            <AlertAction>
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={
                  <Link href={`${skeletonHref(world.id)}?section=endings`} />
                }
              >
                Add Endings
              </Button>
            </AlertAction>
          </Alert>
        ) : null}
        <div className="flex min-h-[28rem] flex-1 flex-col lg:min-h-0">
          <StoryMapDiagram map={map} selected={selected} onSelect={setChosen} />
        </div>
        <FlagLegend
          map={map}
          selected={selected}
          onSelect={setChosen}
          className="border-t px-4 py-3"
        />
      </div>
      <DetailPane
        map={map}
        world={world}
        selected={selected}
        onSelect={setChosen}
        className="border-t lg:border-t-0 lg:border-l"
      />
    </div>
  )
}
