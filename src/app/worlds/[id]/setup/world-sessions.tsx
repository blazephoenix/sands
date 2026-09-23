"use client"

/** A ready World's Sessions, newest first, each linking to its Session page. */
import Link from "next/link"
import { ChevronRightIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@/components/ui/item"
import type { SessionSummary } from "@/domain/api"
import type { Ending } from "@/domain/session"

import { withScenario } from "./scenario-href"

const ENDING: Record<Ending, { label: string; variant: "secondary" | "outline" | "default" | "destructive" }> = {
  none: { label: "In play", variant: "secondary" },
  win: { label: "Won", variant: "default" },
  death: { label: "Died", variant: "destructive" },
  removed: { label: "Removed from the case", variant: "outline" },
}

const DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })

export function WorldSessions({ sessions }: { sessions: readonly SessionSummary[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sessions in this World</CardTitle>
        <CardDescription>
          {sessions.length === 0
            ? "No Session has been played yet. Start one when the World is solvable."
            : "Each Session plays its own copy of the Entries it started with."}
        </CardDescription>
      </CardHeader>
      {sessions.length > 0 ? (
        <CardContent>
          <ItemGroup className="gap-1">
            {sessions.map((session) => (
              <Item key={session.id} size="sm" render={<Link href={withScenario(`/sessions/${encodeURIComponent(session.id)}`)} />}>
                <ItemContent>
                  <ItemTitle>Started {DATE.format(new Date(session.createdAt))}</ItemTitle>
                  <ItemDescription>
                    {session.turnCount} {session.turnCount === 1 ? "Turn" : "Turns"}
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Badge variant={ENDING[session.ending].variant}>{ENDING[session.ending].label}</Badge>
                  <ChevronRightIcon aria-hidden className="text-muted-foreground" />
                </ItemActions>
              </Item>
            ))}
          </ItemGroup>
        </CardContent>
      ) : null}
    </Card>
  )
}
