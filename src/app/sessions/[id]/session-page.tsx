"use client"

/**
 * `/sessions/[id]`: the Player plays a Session and the Author watches the
 * harness work. The story column owns the page; the Codex and the harness
 * open as right-side sheets.
 */
import * as React from "react"
import Link from "next/link"
import { BookOpenIcon, SearchXIcon, TriangleAlertIcon } from "lucide-react"

import { ShellActions, ShellBreadcrumbs, worldCrumbs } from "@/components/app-shell"
import { ShortcutKeys } from "@/components/shortcut-keys"
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { GetSessionResponse } from "@/domain/session-view"
import { useSingleKeyShortcut } from "@/lib/keyboard"
import { cn } from "@/lib/utils"

import { CodexPane, unseenPlayEntries } from "./codex-pane"
import { EndingScreen } from "./ending"
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
  const { run, playTurn, revealing, finishReveal, backgroundPending, update, localEntries } = session
  const [draft, setDraft] = React.useState("")
  const [announcement, setAnnouncement] = React.useState("")
  const inputRef = React.useRef<HTMLTextAreaElement>(null)
  const turnRefs = React.useRef(new Map<string, HTMLElement>())
  const endingRef = React.useRef<HTMLHeadingElement>(null)
  const playerName = playerNameOf(data)
  const ended = data.session.ending !== "none"
  const turns = ended ? data.turns.slice(0, -1) : data.turns

  const [sheet, setSheet] = React.useState<"codex" | "harness" | null>(null)
  const toggleSheet = (which: "codex" | "harness") => setSheet((open) => (open === which ? null : which))
  useSingleKeyShortcut("c", () => toggleSheet("codex"))
  const newEntries = unseenPlayEntries(data.entries).length

  // On load: the latest Turn in view, the cursor in the input.
  React.useEffect(() => {
    window.scrollTo({ top: document.documentElement.scrollHeight })
    inputRef.current?.focus()
  }, [])

  // The Ending: once its final Passage has revealed, bring the Ending screen into view and focus it.
  React.useEffect(() => {
    if (!ended || revealing) return
    endingRef.current?.focus({ preventScroll: true })
    scrollToElement(endingRef.current, "center")
  }, [ended, revealing])

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
      const ending = turn.state.ending === "none" ? "" : ` The story has ended: ${turn.state.ending}.`
      setAnnouncement(`Turn ${turn.idx + 1}. ${turn.passage}${ending}`)
    }
    // The textarea was disabled during the Turn, which drops focus; give it back.
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  return (
    <div className="flex flex-1 flex-col">
      <ShellBreadcrumbs items={worldCrumbs(data.world, { session: `Session ${data.sessionNumber}` })} />
      <ShellActions>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant={sheet === "codex" ? "secondary" : "ghost"}
                size="sm"
                aria-expanded={sheet === "codex"}
                aria-label={newEntries > 0 ? `Codex, ${newEntries} new` : "Codex"}
                onClick={() => toggleSheet("codex")}
              />
            }
          >
            <BookOpenIcon data-icon="inline-start" />
            Codex
            {/* Always rendered, so the header does not shift when a new Entry lands. */}
            <Badge variant="secondary" className={cn("tabular-nums", newEntries === 0 && "invisible")} aria-hidden>
              {newEntries} new
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            {sheet === "codex" ? "Close the Codex" : "Open the Codex"}
            <ShortcutKeys shortcut="c" />
          </TooltipContent>
        </Tooltip>
      </ShellActions>
      <h1 className="sr-only">
        {data.world.name}, Session {data.sessionNumber}
      </h1>
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      <article aria-label="Story" className={cn(PROSE, "flex flex-1 flex-col gap-10 pt-10 pb-8")}>
        {data.turns.length === 0 ? (
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
        {ended ? (
          <EndingScreen
            data={data}
            playerName={playerName}
            revealing={revealing === data.turns.at(-1)?.id}
            onRevealed={finishReveal}
            headingRef={endingRef}
            onOpenCodex={() => setSheet("codex")}
          />
        ) : null}
      </article>

      {ended ? null : (
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
      )}

      <Sheet open={sheet !== null} onOpenChange={(open) => (open ? undefined : setSheet(null))}>
        <SheetContent side="right" finalFocus={ended ? true : inputRef} className="w-full gap-0 data-[side=right]:sm:max-w-2xl">
          {sheet === "codex" ? (
            <>
              <SheetHeader>
                <SheetTitle>Codex</SheetTitle>
                <SheetDescription>This Session&apos;s Entries. Edits and status changes apply from the next Turn.</SheetDescription>
              </SheetHeader>
              <CodexPane data={data} update={update} localEntries={localEntries} />
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
