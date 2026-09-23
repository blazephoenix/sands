"use client"

/**
 * The Ending screen: the final Passage, which Ending was reached, a short
 * summary of the Session, and what to do next.
 */
import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { BookOpenIcon, DoorClosedIcon, PlayIcon, SkullIcon, TrophyIcon, type LucideIcon } from "lucide-react"

import { ShortcutKeys } from "@/components/shortcut-keys"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { Ending } from "@/domain/session"
import type { GetSessionResponse } from "@/domain/session-view"
import { bandFor } from "@/engine/config"
import { api, ApiError } from "@/lib/api-client"

import { TurnSection } from "./story"
import { withScenario, worldHref } from "@/components/worlds/world-links"

type Reached = Exclude<Ending, "none">

const ENDINGS: Record<Reached, { label: string; icon: LucideIcon; title: (player: string) => string; description: (player: string, condition: string | null) => string }> = {
  win: {
    label: "Win",
    icon: TrophyIcon,
    title: () => "The case is closed",
    description: (_player, condition) => condition ?? "The win condition was met.",
  },
  death: {
    label: "Death",
    icon: SkullIcon,
    title: (player) => `${player} is dead`,
    description: () => "A reckless action proved lethal. The story ends here.",
  },
  removed: {
    label: "Removed",
    icon: DoorClosedIcon,
    title: () => "Removed from the case",
    description: (player) => `The authorities have lost patience with ${player}. The story ends here.`,
  },
}

export function EndingScreen({
  data,
  playerName,
  revealing,
  onRevealed,
  onOpenCodex,
  headingRef,
}: {
  data: GetSessionResponse
  playerName: string
  revealing: boolean
  onRevealed: () => void
  /** Omitted until the page has a Codex to open. */
  onOpenCodex?: () => void
  headingRef: React.RefObject<HTMLHeadingElement | null>
}) {
  const router = useRouter()
  const [starting, setStarting] = React.useState(false)
  const finalTurn = data.turns.at(-1)
  const reached = data.session.ending
  if (!finalTurn || reached === "none") return null

  const ending = ENDINGS[reached]
  const Icon = ending.icon
  const { state } = finalTurn
  const clueTotal = data.entries.filter((entry) => entry.kind === "clue" && entry.status !== "rejected").length
  const band = bandFor(state.reputation)
  const worldPageHref = withScenario(worldHref(data.world))

  const startNew = async () => {
    setStarting(true)
    try {
      const { session } = await api.createSession({ worldId: data.world.id })
      router.push(withScenario(`/sessions/${encodeURIComponent(session.id)}`))
    } catch (error) {
      setStarting(false)
      toast.add({
        type: "error",
        title: "The new Session did not start",
        description: error instanceof ApiError ? error.message : "Something went wrong. Try again.",
        actionProps: { children: "Try again", onClick: () => void startNew() },
      })
    }
  }

  return (
    <div className="flex flex-col gap-10">
      <TurnSection turn={finalTurn} revealing={revealing} onRevealed={onRevealed} />
      {revealing ? null : (
        <section aria-labelledby="ending-title" className="flex animate-in flex-col gap-10 duration-300 fade-in-0 motion-reduce:animate-none">
          <Separator />
          <Card>
            <CardHeader className="justify-items-center gap-2 text-center">
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted" aria-hidden>
                <Icon />
              </div>
              <Badge variant="outline">Ending: {ending.label.toLowerCase()}</Badge>
              <CardTitle className="text-xl">
                <h2 id="ending-title" ref={headingRef} tabIndex={-1} className="outline-none">
                  {ending.title(playerName)}
                </h2>
              </CardTitle>
              <CardDescription className="max-w-prose text-balance">
                {ending.description(playerName, reached === "win" ? (data.world.brief?.ending.condition ?? null) : null)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-3 gap-4 text-center">
                <Stat label="Turns played" value={String(data.turns.length)} />
                <Stat label="Clues found" value={clueTotal > 0 ? `${state.cluesFound.length} of ${clueTotal}` : String(state.cluesFound.length)} />
                <Stat
                  label="Reputation"
                  value={
                    <span className="flex items-center justify-center gap-2">
                      {state.reputation}
                      <Badge variant="secondary">{band} Band</Badge>
                    </span>
                  }
                />
              </dl>
            </CardContent>
            <CardFooter className="flex-wrap justify-center gap-2">
              <Button onClick={startNew} disabled={starting}>
                {starting ? <Spinner data-icon="inline-start" /> : <PlayIcon data-icon="inline-start" />}
                Start a new Session
              </Button>
              {onOpenCodex ? (
                <Tooltip>
                  <TooltipTrigger render={<Button variant="outline" onClick={onOpenCodex} />}>
                    <BookOpenIcon data-icon="inline-start" />
                    Open the Codex
                  </TooltipTrigger>
                  <TooltipContent>
                    Codex
                    <ShortcutKeys shortcut="c" />
                  </TooltipContent>
                </Tooltip>
              ) : null}
              <Button variant="ghost" render={<Link href={worldPageHref} />} nativeButton={false}>
                Return to the World
              </Button>
            </CardFooter>
          </Card>
        </section>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-lg font-medium tabular-nums">{value}</dd>
    </div>
  )
}
