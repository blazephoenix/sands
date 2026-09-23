"use client"

/**
 * The Brief page (ticket 02, spec §7.1, §8, §11): the Author writes the Brief
 * in the shared editor, sees every §7.1 problem live, and runs setup while
 * watching it step by step. Success moves on to the setup review.
 *
 * - Autosave through `PUT /api/worlds/[id]/brief`, debounced, with a status
 *   that tells the truth. Cmd/Ctrl+S saves now. Unsaved edits are also kept in
 *   this browser until the server has them, so a reload loses nothing.
 * - Leaving with unsaved edits, or while setup runs, is guarded.
 * - Run setup (Cmd/Ctrl+Enter) streams `POST /api/worlds/[id]/setup`.
 */
import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  FileQuestionIcon,
  LockIcon,
  PlayIcon,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
import { toast } from "@/components/ui/toast"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { SetupStatusBadge } from "@/components/worlds/setup-status-badge"
import { setupReviewHref, withScenario } from "@/components/worlds/world-links"
import { documentToBrief } from "@/brief/from-document"
import type { BriefBlockType } from "@/brief/fields"
import type { SaveBriefRequest } from "@/domain/api"
import type { BriefIssue, BriefWarning } from "@/domain/brief"
import type { World } from "@/domain/world"
import {
  BriefEditor,
  EditorSkeleton,
  type BriefEditorChange,
  type BriefEditorHandle,
} from "@/editor"
import { insertBriefSection } from "@/editor/commands"
import { readFieldLine } from "@/editor/field-line"
import type { SandsBlock } from "@/editor/schema-config"
import { api, ApiError, isAbortError } from "@/lib/api-client"

import { Autosave, type SaveStatus } from "./autosave"
import {
  clearBriefBackup,
  readBriefBackup,
  writeBriefBackup,
} from "./brief-backup"
import { BriefChecks } from "./brief-checks"
import { SaveIndicator } from "./save-indicator"
import { SetupLiveRegion, SetupPanel } from "./setup-panel"
import {
  failSetupRun,
  idleSetupRun,
  reduceSetupEvent,
  startingSetupRun,
  type SetupRun,
} from "./setup-progress"
import { WorldName } from "./world-name"

export const RUN_SETUP_SHORTCUT = "Mod-Enter"

/** How long the finished stepper stays on screen before the setup review opens. */
const SUCCESS_PAUSE_MS = 700

type Load =
  | { state: "loading" }
  | { state: "error"; error: ApiError }
  | { state: "ready"; world: World }

export function BriefPage({ worldId }: { worldId: string }) {
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
          error:
            error instanceof ApiError
              ? error
              : new ApiError(
                  0,
                  "internal",
                  "The Brief did not load. Try again."
                ),
        })
      })
    return () => controller.abort()
  }, [worldId, attempt])

  if (load.state === "loading") return <BriefPageSkeleton />

  if (load.state === "error") {
    if (load.error.status === 404) {
      return (
        <PageFrame>
          <ShellBreadcrumbs
            items={[{ label: "Worlds", href: "/" }, { label: "Brief" }]}
          />
          <Empty className="col-span-full flex-none border py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileQuestionIcon />
              </EmptyMedia>
              <EmptyTitle>There is no World here</EmptyTitle>
              <EmptyDescription>{load.error.message}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button
                render={<Link href={withScenario("/")} />}
                nativeButton={false}
              >
                Go to your Worlds
              </Button>
            </EmptyContent>
          </Empty>
        </PageFrame>
      )
    }
    return (
      <PageFrame>
        <ShellBreadcrumbs
          items={[{ label: "Worlds", href: "/" }, { label: "Brief" }]}
        />
        <Alert variant="destructive" className="col-span-full">
          <TriangleAlertIcon aria-hidden />
          <AlertTitle>The Brief did not load</AlertTitle>
          <AlertDescription>{load.error.message}</AlertDescription>
          <AlertAction>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setLoad({ state: "loading" })
                setAttempt((a) => a + 1)
              }}
            >
              Retry
            </Button>
          </AlertAction>
        </Alert>
      </PageFrame>
    )
  }

  return <BriefWorkspace key={load.world.id} initialWorld={load.world} />
}

function PageFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto grid w-full max-w-screen-xl flex-1 content-start gap-x-12 gap-y-8 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_19rem]">
      {children}
    </div>
  )
}

function BriefPageSkeleton() {
  return (
    <PageFrame>
      <ShellBreadcrumbs
        items={[{ label: "Worlds", href: "/" }, { label: "Brief" }]}
      />
      <div
        className="flex min-w-0 flex-col gap-4"
        aria-busy="true"
        aria-label="Loading the Brief"
      >
        <div className="flex flex-col gap-2.5 sm:px-[54px]">
          <Skeleton className="h-9 w-72 max-w-full" />
          <Skeleton className="h-5 w-48" />
        </div>
        <EditorSkeleton sections={4} />
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    </PageFrame>
  )
}

type InitialContent = {
  name: string
  briefDoc: unknown[]
  restored: boolean
  staleBackup: boolean
}

/** What the editor opens with: the server's Brief, or newer unsaved edits this browser kept. */
function initialContent(world: World): InitialContent {
  const backup =
    world.setupStatus === "draft" ? readBriefBackup(world.id) : null
  const fromServer = {
    name: world.name,
    briefDoc: world.briefDoc,
    restored: false,
    staleBackup: backup !== null,
  }
  if (!backup || backup.at <= Date.parse(world.updatedAt)) return fromServer
  const same =
    backup.name === world.name &&
    JSON.stringify(backup.briefDoc) === JSON.stringify(world.briefDoc)
  if (same) return fromServer
  return {
    name: backup.name,
    briefDoc: backup.briefDoc,
    restored: true,
    staleBackup: false,
  }
}

/** The first `Label: value` line in the document: where a new Brief's cursor goes. */
function firstFieldId(document: readonly SandsBlock[]) {
  return document.find((block) => readFieldLine(block) !== null)?.id ?? null
}

function statusMessage(status: SaveStatus) {
  return status.kind === "error" ? status.message : ""
}

type LeaveRequest = { href: string; reason: "unsaved" | "setup" }

/**
 * The page's latest edits, outside React state so the autosave snapshot and
 * the leave handlers always read the newest values, plus the autosave itself.
 */
class BriefDraft {
  name: string
  briefDoc: unknown[]
  locked: boolean
  /** The document as last recorded, to tell real edits from no-op editor changes. */
  private briefDocJson: string
  readonly autosave: Autosave<SaveBriefRequest>

  constructor(
    worldId: string,
    initial: InitialContent,
    locked: boolean,
    onSaved: (world: World) => void
  ) {
    this.name = initial.name
    this.briefDoc = initial.briefDoc
    this.briefDocJson = JSON.stringify(initial.briefDoc)
    this.locked = locked
    this.autosave = new Autosave<SaveBriefRequest>({
      snapshot: this.snapshot,
      save: async (body) => onSaved((await api.saveBrief(worldId, body)).world),
      isRetryable: (error) => !(error instanceof ApiError) || error.retryable,
      messageOf: (error) =>
        error instanceof ApiError
          ? error.message
          : "The server did not save the Brief. Try again.",
    })
  }

  setName(name: string) {
    this.name = name
  }

  /**
   * Records the editor's document. False when nothing changed: the editor also
   * reports changes that leave the document as it was (e.g. turning read-only
   * while setup runs), and those must not become saves.
   */
  setDocument(briefDoc: unknown[]): boolean {
    const json = JSON.stringify(briefDoc)
    if (json === this.briefDocJson) return false
    this.briefDoc = briefDoc
    this.briefDocJson = json
    return true
  }

  /**
   * Takes the editor's own rendering of the loaded document as the baseline.
   * BlockNote normalizes what it loads (key order, default props), so the
   * stored JSON is not comparable with what the editor reports.
   */
  setBaseline(briefDoc: unknown[]) {
    this.briefDoc = briefDoc
    this.briefDocJson = JSON.stringify(briefDoc)
  }

  setLocked(locked: boolean) {
    this.locked = locked
  }

  /** The PUT body: the name always, the document while the Brief is not locked. */
  snapshot = (): SaveBriefRequest => ({
    name: this.name,
    briefDoc: this.locked ? undefined : this.briefDoc,
  })
}

function BriefWorkspace({ initialWorld }: { initialWorld: World }) {
  const router = useRouter()
  const worldId = initialWorld.id
  const [world, setWorld] = React.useState(initialWorld)
  const locked = world.setupStatus !== "draft"

  const [initial] = React.useState(() => initialContent(initialWorld))
  const [name, setName] = React.useState(initial.name)
  const [conversion, setConversion] = React.useState(() =>
    documentToBrief(initial.briefDoc as SandsBlock[])
  )
  const [editingName, setEditingName] = React.useState(false)
  const [confirmKey, setConfirmKey] = React.useState(0)
  const [saveAnnouncement, setSaveAnnouncement] = React.useState("")
  const [run, setRun] = React.useState<SetupRun>(idleSetupRun)
  const [streamStartedAt, setStreamStartedAt] = React.useState<number | null>(
    null
  )
  const [leaveTo, setLeaveTo] = React.useState<LeaveRequest | null>(null)

  const editorRef = React.useRef<BriefEditorHandle>(null)
  const busyRef = React.useRef(false)
  const setupAbort = React.useRef<AbortController | null>(null)
  const backupTimer = React.useRef<number | null>(null)
  const restoreHandled = React.useRef(false)

  // One draft and autosave per page.
  const [draft] = React.useState(
    () =>
      new BriefDraft(
        worldId,
        initial,
        initialWorld.setupStatus !== "draft",
        (saved) =>
          setWorld((current) => ({
            ...current,
            updatedAt: saved.updatedAt,
            brief: saved.brief,
            setupStatus: saved.setupStatus,
          }))
      )
  )
  const { autosave } = draft
  const status = React.useSyncExternalStore(
    autosave.subscribe,
    autosave.getStatus,
    autosave.getStatus
  )

  const busy =
    run.phase === "starting" ||
    run.phase === "running" ||
    run.phase === "succeeded"
  const problems = conversion.issues.length
  const canRun = !locked && problems === 0 && !busy
  const disabledReason = busy
    ? "Setup is running."
    : problems > 0
      ? `Fix ${problems === 1 ? "the problem" : `the ${problems} problems`} listed under Checks first.`
      : null

  React.useEffect(() => {
    draft.setLocked(locked)
    busyRef.current = run.phase === "starting" || run.phase === "running"
  })

  // Backups of unsaved edits in this browser.
  const writeBackupNow = React.useCallback(() => {
    if (backupTimer.current !== null) window.clearTimeout(backupTimer.current)
    backupTimer.current = null
    if (draft.locked) return
    writeBriefBackup(worldId, {
      name: draft.name,
      briefDoc: draft.briefDoc,
      at: Date.now(),
    })
  }, [draft, worldId])

  const recordChange = React.useCallback(() => {
    autosave.change()
    if (backupTimer.current !== null) window.clearTimeout(backupTimer.current)
    backupTimer.current = window.setTimeout(writeBackupNow, 300)
  }, [autosave, writeBackupNow])

  // Once the server has every edit, the browser copy is no longer needed.
  React.useEffect(
    () =>
      autosave.subscribe(() => {
        if (autosave.getStatus().kind !== "saved" || autosave.dirty) return
        if (backupTimer.current !== null)
          window.clearTimeout(backupTimer.current)
        backupTimer.current = null
        clearBriefBackup(worldId)
      }),
    [autosave, worldId]
  )

  // Edits restored from this browser are saved straight away.
  React.useEffect(() => {
    if (restoreHandled.current) return
    restoreHandled.current = true
    if (initial.restored) {
      autosave.change()
      toast.add({
        title: "Unsaved edits restored",
        description:
          "This browser kept edits the server did not have. They are back in the Brief and being saved now.",
      })
    } else if (initial.staleBackup) {
      clearBriefBackup(worldId)
    }
  }, [autosave, initial, worldId])

  // Autosave runs while the page is mounted. Leaving saves what is pending on the way out.
  React.useEffect(() => {
    autosave.start()
    const saveOnLeave = () => {
      if (!autosave.dirty) return
      writeBackupNow()
      api
        .saveBrief(worldId, draft.snapshot(), { keepalive: true })
        .catch(() => {
          // The browser copy above keeps the edits; the Brief offers them back next time.
        })
    }
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!autosave.dirty && !autosave.saving && !busyRef.current) return
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("pagehide", saveOnLeave)
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => {
      window.removeEventListener("pagehide", saveOnLeave)
      window.removeEventListener("beforeunload", onBeforeUnload)
      saveOnLeave()
      autosave.stop()
    }
  }, [autosave, draft, worldId, writeBackupNow])

  // Setup stops if the page goes away.
  React.useEffect(() => () => setupAbort.current?.abort(), [])

  // In-app links (breadcrumbs, the app name) wait for the save, or ask first.
  React.useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return
      const anchor =
        event.target instanceof Element ? event.target.closest("a[href]") : null
      if (
        !(anchor instanceof HTMLAnchorElement) ||
        (anchor.target && anchor.target !== "_self") ||
        anchor.hasAttribute("download")
      )
        return
      const url = new URL(anchor.href, window.location.href)
      if (
        url.origin !== window.location.origin ||
        url.pathname === window.location.pathname
      )
        return
      if (!busyRef.current && !autosave.dirty && !autosave.saving) return
      event.preventDefault()
      event.stopPropagation()
      const href = `${url.pathname}${url.search}${url.hash}`
      if (busyRef.current) {
        setLeaveTo({ href, reason: "setup" })
        return
      }
      void autosave
        .flush()
        .then((saved) =>
          saved ? router.push(href) : setLeaveTo({ href, reason: "unsaved" })
        )
    }
    document.addEventListener("click", onClick, true)
    return () => document.removeEventListener("click", onClick, true)
  }, [autosave, router])

  // Once the editor is ready: take its document as the baseline, and put the cursor in a draft Brief's first field.
  React.useEffect(() => {
    let frame = 0
    let tries = 0
    const tryFocus = () => {
      const handle = editorRef.current
      if (!handle?.editor()) {
        if (tries++ < 600) frame = window.requestAnimationFrame(tryFocus)
        return
      }
      draft.setBaseline(handle.document())
      if (initialWorld.setupStatus !== "draft") return
      const active = document.activeElement
      if (active && active !== document.body && active.id !== "main") return
      const target = firstFieldId(handle.document())
      if (target) handle.focusBlock(target)
    }
    frame = window.requestAnimationFrame(tryFocus)
    return () => window.cancelAnimationFrame(frame)
  }, [draft, initialWorld.setupStatus])

  const onEditorChange = React.useCallback(
    (change: BriefEditorChange) => {
      if (!draft.setDocument(change.document)) return
      setConversion(change.conversion)
      recordChange()
    },
    [draft, recordChange]
  )

  const rename = (next: string) => {
    draft.setName(next)
    setName(next)
    recordChange()
  }

  const saveNow = async () => {
    const saved = await autosave.flush()
    setConfirmKey((k) => k + 1)
    setSaveAnnouncement(
      saved
        ? `Brief saved at ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}.`
        : `Not saved. ${statusMessage(autosave.getStatus())}`
    )
  }

  const focusIssue = (item: BriefIssue | BriefWarning) =>
    editorRef.current?.focusIssue(item)

  const addSection = (type: BriefBlockType) => {
    const editor = editorRef.current?.editor()
    if (!editor) return
    const last = editor.document.at(-1)
    if (last) editor.setTextCursorPosition(last, "end")
    const inserted = insertBriefSection(editor, type)
    // With no Character at all, the one added is the Player character.
    if (
      type === "character" &&
      conversion.draft.characters.length === 0 &&
      inserted[0]
    ) {
      editor.updateBlock(inserted[0], { props: { isPlayer: true } } as never)
    }
    editor.focus()
  }

  const runSetup = async () => {
    if (!canRun) {
      if (disabledReason && !locked)
        toast.add({
          title: "Setup cannot run yet",
          description: disabledReason,
        })
      return
    }
    setRun(startingSetupRun())
    setStreamStartedAt(null)
    const saved = await autosave.flush()
    if (!saved) {
      setRun((current) =>
        failSetupRun(current, {
          code: "request",
          step: null,
          gaps: [],
          message:
            `The Brief could not be saved, so setup did not start. ${statusMessage(autosave.getStatus())}`.trim(),
        })
      )
      return
    }
    const controller = new AbortController()
    setupAbort.current = controller
    try {
      for await (const event of api.streamSetup(worldId, {
        signal: controller.signal,
      })) {
        // Anchor the ticking clock to the server's stream clock, so a running step never overshoots its final time.
        const receivedAt = Date.now()
        setStreamStartedAt((start) => start ?? receivedAt - event.at)
        setRun((current) => reduceSetupEvent(current, event))
        if (event.type === "result") {
          draft.setLocked(true)
          setWorld(event.world)
          clearBriefBackup(worldId)
          window.setTimeout(
            () => router.push(withScenario(setupReviewHref(worldId))),
            SUCCESS_PAUSE_MS
          )
        }
      }
    } catch (error) {
      if (isAbortError(error)) return
      const apiError = error instanceof ApiError ? error : null
      setRun((current) =>
        failSetupRun(current, {
          code: apiError?.code === "conflict" ? "conflict" : "request",
          step: null,
          gaps: [],
          message:
            apiError?.message ?? "Setup stopped unexpectedly. Try again.",
        })
      )
    } finally {
      if (setupAbort.current === controller) setupAbort.current = null
    }
  }

  // Page shortcuts: Cmd/Ctrl+S saves, Cmd/Ctrl+Enter runs setup, F2 renames. They work inside the editor too.
  const actions = React.useRef({
    saveNow,
    runSetup,
    startRename: () => setEditingName(true),
  })
  React.useEffect(() => {
    actions.current = {
      saveNow,
      runSetup,
      startRename: () => setEditingName(true),
    }
  })
  const dialogOpen = leaveTo !== null
  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (dialogOpen || event.repeat) return
      const mod = event.metaKey || event.ctrlKey
      if (
        mod &&
        !event.shiftKey &&
        !event.altKey &&
        event.key.toLowerCase() === "s"
      ) {
        event.preventDefault()
        void actions.current.saveNow()
      } else if (
        mod &&
        !event.shiftKey &&
        !event.altKey &&
        event.key === "Enter"
      ) {
        event.preventDefault()
        void actions.current.runSetup()
      } else if (
        !mod &&
        !event.shiftKey &&
        !event.altKey &&
        event.key === "F2"
      ) {
        event.preventDefault()
        actions.current.startRename()
      }
    }
    window.addEventListener("keydown", onKeyDown, true)
    return () => window.removeEventListener("keydown", onKeyDown, true)
  }, [dialogOpen])

  const showLockedNotice = locked && run.phase !== "succeeded"

  return (
    <PageFrame>
      <ShellBreadcrumbs
        items={worldCrumbs(
          { id: worldId, name, setupStatus: world.setupStatus },
          "Brief"
        )}
      />
      <ShellActions>
        <SaveIndicator
          status={status}
          onSaveNow={() => void saveNow()}
          confirmKey={confirmKey}
        />
        {locked ? (
          world.setupStatus === "drafting" ? null : (
            <Button
              render={<Link href={withScenario(setupReviewHref(worldId))} />}
              nativeButton={false}
            >
              Open setup review
            </Button>
          )
        ) : (
          <RunSetupButton
            busy={busy}
            canRun={canRun}
            disabledReason={disabledReason}
            onRun={() => void runSetup()}
          />
        )}
      </ShellActions>

      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-col gap-3 sm:px-[54px]">
          <header className="flex flex-col gap-1.5">
            <WorldName
              name={name}
              onRename={rename}
              editing={editingName}
              onEditingChange={setEditingName}
            />
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              <SetupStatusBadge status={world.setupStatus} />
              <span>
                {locked
                  ? "The Brief is read-only."
                  : "Type / to add a Setting, Character, Arc, Ending, Location or Voice."}
              </span>
            </div>
          </header>
          {showLockedNotice ? <LockedNotice world={world} /> : null}
        </div>
        <BriefEditor
          ref={editorRef}
          initialDocument={initial.briefDoc as SandsBlock[]}
          readOnly={locked || busy}
          onChange={onEditorChange}
        />
      </div>

      <aside
        aria-label="Checks and setup"
        className="flex flex-col gap-8 lg:sticky lg:top-20 lg:max-h-[calc(100svh-6rem)] lg:self-start lg:overflow-y-auto"
      >
        <SetupPanel
          run={run}
          streamStartedAt={streamStartedAt}
          canRetry={canRun}
          onRetry={() => void runSetup()}
          onDismiss={() => setRun(idleSetupRun())}
        />
        {locked ? null : (
          <BriefChecks
            conversion={conversion}
            onFocus={focusIssue}
            onAddSection={addSection}
          />
        )}
      </aside>

      <SetupLiveRegion text={run.announcement} />
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {status.kind === "error"
          ? `Not saved. ${status.message}`
          : saveAnnouncement}
      </div>

      <AlertDialog
        open={dialogOpen}
        onOpenChange={(open) => (open ? null : setLeaveTo(null))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {leaveTo?.reason === "setup"
                ? "Stop setup and leave?"
                : "Leave before your edits are saved?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {leaveTo?.reason === "setup"
                ? "Setup is still running. Leaving stops it; the World stays a draft and your Brief is kept."
                : `The server has not saved your latest edits. ${statusMessage(status)} This browser keeps them and offers them back when you reopen this Brief.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                const href = leaveTo?.href
                setLeaveTo(null)
                if (href) router.push(href)
              }}
            >
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageFrame>
  )
}

function RunSetupButton({
  busy,
  canRun,
  disabledReason,
  onRun,
}: {
  busy: boolean
  canRun: boolean
  disabledReason: string | null
  onRun: () => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            onClick={onRun}
            disabled={!canRun}
            focusableWhenDisabled
            aria-describedby={disabledReason ? "run-setup-reason" : undefined}
            aria-keyshortcuts="Control+Enter Meta+Enter"
            className="data-disabled:opacity-50"
          />
        }
      >
        {busy ? (
          <Spinner
            data-icon="inline-start"
            className="motion-reduce:animate-none"
            aria-hidden
          />
        ) : (
          <PlayIcon data-icon="inline-start" aria-hidden />
        )}
        {busy ? "Running setup…" : "Run setup"}
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <span className="flex flex-col gap-1">
          <span>
            {disabledReason ??
              "Draft the World from this Brief. Takes about a minute."}
          </span>
          <span className="flex items-center gap-1.5">
            Run setup
            <ShortcutKeys shortcut={RUN_SETUP_SHORTCUT} />
          </span>
        </span>
      </TooltipContent>
      {disabledReason ? (
        <span id="run-setup-reason" className="sr-only">
          {disabledReason}
        </span>
      ) : null}
    </Tooltip>
  )
}

function LockedNotice({ world }: { world: World }) {
  if (world.setupStatus === "drafting") {
    return (
      <Alert>
        <Spinner className="motion-reduce:animate-none" aria-hidden />
        <AlertTitle>Setup is running</AlertTitle>
        <AlertDescription>
          Setup started for this World elsewhere, so the Brief is locked until
          it finishes or fails. Reload to see where it is.
        </AlertDescription>
      </Alert>
    )
  }
  return (
    <Alert>
      <LockIcon aria-hidden />
      <AlertTitle>The Brief is locked</AlertTitle>
      <AlertDescription>
        Setup has run, so the Brief can no longer change. Review what setup
        drafted from it in the setup review.
      </AlertDescription>
    </Alert>
  )
}
