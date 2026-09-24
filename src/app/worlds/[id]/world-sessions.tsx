"use client"

/**
 * A playable World's Sessions, most recent first. Each row names the Session
 * by its number in the World, when it started, the Turns the Player played
 * (the Opening is not counted) and whether it is in play or which Ending it
 * reached. A row opens the Session.
 */
import Link from "next/link"
import { ChevronRightIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item"
import { Skeleton } from "@/components/ui/skeleton"
import { sessionHref } from "@/components/worlds/world-links"
import type { SessionSummary } from "@/domain/api"
import { playerTurnCount, type Ending } from "@/domain/session"

const STATE: Record<
  Ending,
  { label: string; variant: "secondary" | "outline" }
> = {
  none: { label: "In play", variant: "secondary" },
  win: { label: "Ending: win", variant: "outline" },
  death: { label: "Ending: death", variant: "outline" },
  removed: { label: "Ending: removed", variant: "outline" },
}

const STARTED = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
})

/** `sessions` newest first, as `GET /api/worlds/[id]` returns them; Session numbers count from the oldest. */
export function WorldSessions({
  sessions,
}: {
  sessions: readonly SessionSummary[]
}) {
  return (
    <ItemGroup className="gap-2">
      {sessions.map((session, index) => {
        const number = sessions.length - index
        const turns = playerTurnCount(session.turnCount)
        const state = STATE[session.ending]
        return (
          <div key={session.id} role="listitem">
            <Item
              variant="outline"
              render={<Link href={sessionHref(session.id)} />}
            >
              <ItemContent className="min-w-0">
                <ItemTitle>Session {number}</ItemTitle>
                <ItemDescription>
                  <time dateTime={session.createdAt}>
                    Started {STARTED.format(new Date(session.createdAt))}
                  </time>
                  {" · "}
                  {turns === 1 ? "1 Turn played" : `${turns} Turns played`}
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <Badge variant={state.variant}>{state.label}</Badge>
                <ChevronRightIcon
                  aria-hidden
                  className="text-muted-foreground"
                />
              </ItemActions>
            </Item>
          </div>
        )
      })}
    </ItemGroup>
  )
}

export function WorldSessionsSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-hidden>
      {Array.from({ length: 4 }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5"
        >
          <div className="flex flex-1 flex-col gap-1">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-64" />
          </div>
          <Skeleton className="h-5 w-24 rounded-4xl" />
        </div>
      ))}
    </div>
  )
}
