"use client"

/**
 * `/sessions/[id]`: the Player plays a Session and the Author watches the
 * harness work. The story column owns the page; the Codex and the harness
 * open as right-side sheets.
 */
import * as React from "react"
import Link from "next/link"
import { SearchXIcon, TriangleAlertIcon } from "lucide-react"

import { ShellBreadcrumbs, worldCrumbs } from "@/components/app-shell"
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import type { GetSessionResponse } from "@/domain/session-view"
import { cn } from "@/lib/utils"

import { Composer, PROSE, StoryEmpty, StorySkeleton, TurnSection, scrollToElement } from "./story"
import { useSession } from "./use-session"

const SUGGESTIONS = ["I read the case file at Captain James's desk.", "I ask Amanda what the victims had in common."]

export function SessionPage({ sessionId }: { sessionId: string }) {
  const session = useSession(sessionId)
  const { load, retryLoad } = session

  if (load.status === "loading") return <StorySkeleton />
  if (load.status === "error") {
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
          <TriangleAlertIcon />
          <AlertTitle>The Session did not load</AlertTitle>
          <AlertDescription>{load.error.message}</AlertDescription>
          <AlertAction>
            <Button variant="outline" size="sm" onClick={retryLoad}>
              Retry
            </Button>
          </AlertAction>
        </Alert>
      </div>
    )
  }
  return <SessionView data={load.data} session={session} />
}

type SessionState = ReturnType<typeof useSession>

export function playerNameOf(data: GetSessionResponse) {
  const fromCodex = data.entries.find((entry) => entry.kind === "character" && entry.data.isPlayer)?.name
  return fromCodex || data.world.brief?.characters.find((character) => character.isPlayer)?.name || "your character"
}

function SessionView({ data, session }: { data: GetSessionResponse; session: SessionState }) {
  const { run, playTurn, revealing, finishReveal, backgroundPending } = session
  const [draft, setDraft] = React.useState("")
  const [announcement, setAnnouncement] = React.useState("")
  const inputRef = React.useRef<HTMLTextAreaElement>(null)
  const turnRefs = React.useRef(new Map<string, HTMLElement>())
  const playerName = playerNameOf(data)
  const { turns } = data

  // On load: the latest Turn in view, the cursor in the input.
  React.useEffect(() => {
    window.scrollTo({ top: document.documentElement.scrollHeight })
    inputRef.current?.focus()
  }, [])

  // A new Passage: bring it into view.
  React.useEffect(() => {
    if (!revealing) return
    scrollToElement(turnRefs.current.get(revealing) ?? null)
  }, [revealing])

  // Nothing typed is lost: warn before leaving with an unsent action or a Turn in progress.
  const unsaved = draft.trim() !== "" || run.status === "running"
  React.useEffect(() => {
    if (!unsaved) return
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [unsaved])

  const submit = async (input: string) => {
    setAnnouncement("")
    const turn = await playTurn(input)
    if (turn) {
      setDraft("")
      setAnnouncement(`Turn ${turn.idx + 1}. ${turn.passage}`)
    }
    // The textarea was disabled during the Turn, which drops focus; give it back.
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  return (
    <div className="flex flex-1 flex-col">
      <ShellBreadcrumbs items={worldCrumbs(data.world, { session: `Session ${data.sessionNumber}` })} />
      <h1 className="sr-only">
        {data.world.name}, Session {data.sessionNumber}
      </h1>
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      <article aria-label="Story" className={cn(PROSE, "flex flex-1 flex-col gap-10 pt-10 pb-8")}>
        {turns.length === 0 ? (
          <StoryEmpty
            playerName={playerName}
            suggestions={SUGGESTIONS}
            onSuggest={(text) => {
              setDraft(text)
              inputRef.current?.focus()
            }}
          />
        ) : (
          turns.map((turn) => (
            <TurnSection
              key={turn.id}
              turn={turn}
              revealing={revealing === turn.id}
              onRevealed={finishReveal}
              ref={(element) => {
                if (element) turnRefs.current.set(turn.id, element)
                else turnRefs.current.delete(turn.id)
              }}
            />
          ))
        )}
      </article>

      <Composer
        value={draft}
        onValueChange={setDraft}
        onSubmit={submit}
        run={run}
        revealing={revealing !== null}
        backgroundPending={backgroundPending}
        playerName={playerName}
        inputRef={inputRef}
      />
    </div>
  )
}
