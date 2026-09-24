"use client"

/**
 * `/sessions/[id]`: the Player plays a Session and the Author watches the
 * harness work. The story column owns the page; the Codex and the harness
 * open as right-side sheets. A new Session's Opening writes itself on load
 * and reveals like any Passage; the Player can act once it has been read.
 */
import * as React from "react"
import Link from "next/link"
import {
  BookOpenIcon,
  FlaskConicalIcon,
  SearchXIcon,
  TriangleAlertIcon,
} from "lucide-react"

import {
  ShellActions,
  ShellBreadcrumbs,
  worldCrumbs,
} from "@/components/app-shell"
import { ShortcutKeys } from "@/components/shortcut-keys"
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { isOpening, turnLabel } from "@/domain/session"
import type { GetSessionResponse } from "@/domain/session-view"
import { useSingleKeyShortcut } from "@/lib/keyboard"
import { cn } from "@/lib/utils"

import { CodexPane, unseenPlayEntries } from "./codex-pane"
import { EndingScreen } from "./ending"
import { HarnessPane } from "./harness-pane"
import {
  Composer,
  FirstActionHints,
  OpeningPending,
  PROSE,
  StorySkeleton,
  TurnSection,
  scrollToElement,
} from "./story"
import { useTestMode } from "./test-mode"
import { useSession } from "./use-session"

const SUGGESTIONS = [
  "I look around.",
  "I ask the nearest person what is going on.",
]

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
  const fromCodex = data.entries.find(
    (entry) => entry.kind === "character" && entry.data.isPlayer
  )?.name
  return (
    fromCodex ||
    data.world.brief?.characters.find((character) => character.isPlayer)
      ?.name ||
    "your character"
  )
}

function SessionView({
  data,
  session,
}: {
  data: GetSessionResponse
  session: SessionState
}) {
  const {
    run,
    playTurn,
    playOpening,
    revealing,
    finishReveal,
    backgroundPending,
    update,
    localEntries,
  } = session
  const [draft, setDraft] = React.useState("")
  const [announcement, setAnnouncement] = React.useState("")
  const inputRef = React.useRef<HTMLTextAreaElement>(null)
  const turnRefs = React.useRef(new Map<string, HTMLElement>())
  const endingRef = React.useRef<HTMLHeadingElement>(null)
  const playerName = playerNameOf(data)
  const ended = data.session.ending !== "none"
  const turns = ended ? data.turns.slice(0, -1) : data.turns
  const opening = data.turns.find(isOpening) ?? null
  /** The Opening is still being written, or is revealing: the Player acts once it has been read. */
  const awaitingOpening =
    !ended && (opening === null || revealing === opening.id)

  const [testMode, setTestMode] = useTestMode()
  const [requestedSheet, setSheet] = React.useState<"codex" | "harness" | null>(
    null
  )
  // Test mode off hides the harness pane completely.
  const sheet =
    requestedSheet === "harness" && !testMode ? null : requestedSheet
  // Keep the closing sheet's content while it animates out.
  const [lastSheet, setLastSheet] = React.useState(sheet)
  if (sheet !== null && sheet !== lastSheet) setLastSheet(sheet)
  const content = sheet ?? lastSheet
  const toggleSheet = (which: "codex" | "harness") =>
    setSheet((open) => (open === which ? null : which))
  useSingleKeyShortcut("c", () => toggleSheet("codex"))
  useSingleKeyShortcut("t", () => toggleSheet("harness"), { enabled: testMode })
  const newEntries = unseenPlayEntries(data.entries).length

  // On load: the latest Turn in view, the cursor in the input. A Session still waiting for its Opening stays at the top.
  const loadedWithTurns = React.useRef(data.turns.length > 0)
  React.useEffect(() => {
    if (!loadedWithTurns.current) return
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

  // The Opening arrived: announce it whole (the reveal itself is hidden from screen readers).
  const liveText =
    opening && revealing === opening.id
      ? `${turnLabel(opening)}. ${opening.passage}`
      : announcement

  // Once the Opening has been read (revealed, skipped, or loaded from elsewhere), the Player's turn: focus the input.
  const wasAwaitingOpening = React.useRef(awaitingOpening)
  React.useEffect(() => {
    if (wasAwaitingOpening.current && !awaitingOpening) {
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
    wasAwaitingOpening.current = awaitingOpening
  }, [awaitingOpening])

  // Nothing typed is lost: warn before leaving with an unsent action or a Turn in progress.
  // Not for the Opening: nothing of the Player's is at stake, and a reload simply starts it again.
  const unsaved =
    draft.trim() !== "" || (run.status === "running" && run.input !== null)
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
      const ending =
        turn.state.ending === "none"
          ? ""
          : ` The story has ended: ${turn.state.ending}.`
      setAnnouncement(`${turnLabel(turn)}. ${turn.passage}${ending}`)
    }
    // The textarea was disabled during the Turn, which drops focus; give it back.
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  return (
    <div className="flex flex-1 flex-col">
      <ShellBreadcrumbs
        items={worldCrumbs(data.world, {
          session: `Session ${data.sessionNumber}`,
        })}
      />
      <ShellActions>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant={sheet === "codex" ? "secondary" : "ghost"}
                size="sm"
                aria-expanded={sheet === "codex"}
                aria-label={
                  newEntries > 0 ? `Codex, ${newEntries} new` : "Codex"
                }
                onClick={() => toggleSheet("codex")}
              />
            }
          >
            <BookOpenIcon data-icon="inline-start" />
            Codex
            {/* Always rendered, so the header does not shift when a new Entry lands. */}
            <Badge
              variant="secondary"
              className={cn("tabular-nums", newEntries === 0 && "invisible")}
              aria-hidden
            >
              {newEntries} new
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            {sheet === "codex" ? "Close the Codex" : "Open the Codex"}
            <ShortcutKeys shortcut="c" />
          </TooltipContent>
        </Tooltip>
        {testMode ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant={sheet === "harness" ? "secondary" : "ghost"}
                  size="sm"
                  aria-expanded={sheet === "harness"}
                  onClick={() => toggleSheet("harness")}
                />
              }
            >
              <FlaskConicalIcon data-icon="inline-start" />
              Harness
            </TooltipTrigger>
            <TooltipContent>
              {sheet === "harness"
                ? "Close the harness pane"
                : "Open the harness pane"}
              <ShortcutKeys shortcut="t" />
            </TooltipContent>
          </Tooltip>
        ) : null}
        <Field orientation="horizontal" className="w-auto">
          <Switch
            id="session-test-mode"
            checked={testMode}
            onCheckedChange={(on) => {
              setTestMode(on)
              if (!on && sheet === "harness") setSheet(null)
            }}
          />
          <FieldLabel
            htmlFor="session-test-mode"
            className="font-normal whitespace-nowrap"
          >
            Test mode
          </FieldLabel>
        </Field>
      </ShellActions>
      <h1 className="sr-only">
        {data.world.name}, Session {data.sessionNumber}
      </h1>
      <div aria-live="polite" className="sr-only">
        {liveText}
      </div>

      <article
        aria-label="Story"
        className={cn(PROSE, "flex flex-1 flex-col gap-10 pt-10 pb-8")}
      >
        {data.turns.length === 0 ? (
          <OpeningPending run={run} onRetry={() => void playOpening()} />
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
        {!ended &&
        !awaitingOpening &&
        data.turns.length === 1 &&
        run.status === "idle" ? (
          <FirstActionHints
            playerName={playerName}
            suggestions={SUGGESTIONS}
            onSuggest={(text) => {
              setDraft(text)
              inputRef.current?.focus()
            }}
          />
        ) : null}
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
          awaitingOpening={awaitingOpening}
          playerName={playerName}
          inputRef={inputRef}
        />
      )}

      <Sheet
        open={sheet !== null}
        onOpenChange={(open) => (open ? undefined : setSheet(null))}
      >
        <SheetContent
          side="right"
          finalFocus={ended ? true : inputRef}
          className="w-full gap-0 data-[side=right]:sm:max-w-2xl"
        >
          {content === "codex" ? (
            <>
              <SheetHeader>
                <SheetTitle>Codex</SheetTitle>
                <SheetDescription>
                  This Session&apos;s Entries. Edits and status changes apply
                  from the next Turn.
                </SheetDescription>
              </SheetHeader>
              <CodexPane
                data={data}
                update={update}
                localEntries={localEntries}
              />
            </>
          ) : content === "harness" ? (
            <>
              <SheetHeader>
                <SheetTitle>Harness</SheetTitle>
                <SheetDescription>
                  What the harness did in each finished Turn, newest first.
                </SheetDescription>
              </SheetHeader>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <HarnessPane data={data} />
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
