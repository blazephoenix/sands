"use client"

/**
 * The Skeleton editor, in three panes: the sections on the left; for a
 * section of rows (characters, Arcs, Endings…), the rows in the middle, with
 * Add; and on the right one document in BlockNote: the selected row, or the
 * whole section for Story, Play settings and Voice and canon.
 *
 * Every edit autosaves (Cmd/Ctrl+S saves now). The section and row live in
 * the URL, so a link can open a row. Issues show where they are: a dot on
 * the section, a mark on the row, and the messages above the document.
 *
 * States: loading, not found, load error with Retry, empty section, saving,
 * save failed (retrying; edits are kept), unsaved-on-leave guard.
 */
import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CircleAlertIcon,
  EllipsisIcon,
  PlayIcon,
  PlusIcon,
  SearchXIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react"

import {
  ShellActions,
  ShellBreadcrumbs,
  worldCrumbs,
} from "@/components/app-shell"
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/toast"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { worldHref } from "@/components/worlds/world-links"
import type { World } from "@/domain/world"
import { DocumentEditor, HIDDEN_SHORTCUT } from "@/editor"
import { api, ApiError, isAbortError } from "@/lib/api-client"
import { shortcutKeys } from "@/lib/shortcuts"
import { cn } from "@/lib/utils"
import type { SkeletonIssue } from "@/skeleton/check"
import {
  documentToSkeleton,
  newRow,
  ROW_SECTION_CONFIG,
  type DocBlock,
  type RowSection,
  type SkeletonDocument,
} from "@/skeleton/document"
import { plainText } from "@/skeleton/hidden-text"
import { skeletonIssues } from "@/skeleton/issues"

import { Autosave, type SaveStatus } from "./autosave"
import { SaveIndicator } from "./save-indicator"
import {
  isRowSection,
  issueTarget,
  parseSection,
  SECTION_ORDER,
  sectionTitle,
  type SectionKey,
} from "./sections"

/** Browsers refuse `keepalive` bodies over 64 KB; bigger documents rely on the leave guard. */
const KEEPALIVE_LIMIT = 60_000

type Load =
  | { state: "loading" }
  | { state: "error"; error: ApiError }
  | { state: "ready"; world: World }

function asApiError(error: unknown, fallback: string) {
  return error instanceof ApiError
    ? error
    : new ApiError(0, "internal", fallback)
}

export function SkeletonPage({ worldId }: { worldId: string }) {
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
          error: asApiError(error, "The Skeleton did not load. Try again."),
        })
      })
    return () => controller.abort()
  }, [worldId, attempt])

  if (load.state === "loading") return <PageSkeleton />
  if (load.state === "error") {
    if (load.error.status === 404) {
      return (
        <div className="mx-auto w-full max-w-3xl px-4 py-16">
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <SearchXIcon />
              </EmptyMedia>
              <EmptyTitle>There is no World here</EmptyTitle>
              <EmptyDescription>{load.error.message}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button nativeButton={false} render={<Link href="/" />}>
                Go to your Worlds
              </Button>
            </EmptyContent>
          </Empty>
        </div>
      )
    }
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16">
        <Alert variant="destructive">
          <TriangleAlertIcon aria-hidden />
          <AlertTitle>The Skeleton did not load</AlertTitle>
          <AlertDescription>{load.error.message}</AlertDescription>
          <AlertAction>
            <Button
              variant="outline"
              size="sm"
              autoFocus
              onClick={() => {
                setLoad({ state: "loading" })
                setAttempt((n) => n + 1)
              }}
            >
              Retry
            </Button>
          </AlertAction>
        </Alert>
      </div>
    )
  }
  return <Editor world={load.world} />
}

function useAutosave(worldId: string) {
  const [autosave] = React.useState(
    () =>
      new Autosave<SkeletonDocument>({
        save: async (document) => {
          await api.saveSkeleton(worldId, { document })
        },
        isRetryable: (error) => !(error instanceof ApiError) || error.retryable,
        messageOf: (error) =>
          error instanceof ApiError
            ? error.message
            : "The server did not save the Skeleton.",
      })
  )
  const status = React.useSyncExternalStore<SaveStatus>(
    autosave.subscribe,
    autosave.getStatus,
    autosave.getStatus
  )

  React.useEffect(() => {
    autosave.start()
    const saveOnLeave = () => {
      if (!autosave.dirty) return
      const document = autosave.pending
      if (!document) return
      const body = { document }
      if (JSON.stringify(body).length > KEEPALIVE_LIMIT) return
      void api.saveSkeleton(worldId, body, { keepalive: true }).catch(() => {
        // The leave guard already warned; nothing more can be done as the page unloads.
      })
    }
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (autosave.dirty) event.preventDefault()
    }
    window.addEventListener("pagehide", saveOnLeave)
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => {
      window.removeEventListener("pagehide", saveOnLeave)
      window.removeEventListener("beforeunload", onBeforeUnload)
      // Leaving inside the app: save what is pending now.
      void autosave.flush()
      autosave.stop()
    }
  }, [autosave, worldId])

  return { autosave, status }
}

function Editor({ world }: { world: World }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [document, setDocument] = React.useState(world.document)
  // The documents as of the last edit, for handlers that run between renders.
  const latest = React.useRef(document)
  const { autosave, status } = useAutosave(world.id)
  const [confirmKey, setConfirmKey] = React.useState(0)
  /** A row just added: its editor takes focus, in its empty name. */
  const [justAdded, setJustAdded] = React.useState<string | null>(null)

  const { skeleton, notes } = React.useMemo(
    () => documentToSkeleton(document),
    [document]
  )
  const issues = React.useMemo(
    () => skeletonIssues(skeleton, notes),
    [skeleton, notes]
  )
  const title = plainText(skeleton.story.title).trim()

  const section = parseSection(params.get("section"))
  const rows = isRowSection(section) ? document[section] : null
  const rowId = params.get("row")
  const rowIndex = rows
    ? Math.max(
        rows.findIndex((row) => row.id === rowId),
        0
      )
    : null
  const row = rows && rowIndex !== null ? (rows[rowIndex] ?? null) : null

  const go = React.useCallback(
    (next: SectionKey, nextRow?: string | null) => {
      const search = new URLSearchParams({ section: next })
      if (nextRow) search.set("row", nextRow)
      router.replace(`${pathname}?${search}`, { scroll: false })
    },
    [pathname, router]
  )

  const update = React.useCallback(
    (change: (current: SkeletonDocument) => SkeletonDocument) => {
      const next = change(latest.current)
      latest.current = next
      setDocument(next)
      autosave.change(next)
    },
    [autosave]
  )

  // Cmd/Ctrl+S saves now, even from inside the editor.
  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault()
        setConfirmKey((n) => n + 1)
        void autosave.flush()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [autosave])

  const onBlocks = (blocks: DocBlock[]) => {
    if (rows && row) {
      const key = section as RowSection
      update((current) => ({
        ...current,
        [key]: current[key].map((r) =>
          r.id === row.id ? { ...r, blocks } : r
        ),
      }))
    } else if (!isRowSection(section)) {
      update((current) => ({ ...current, [section]: blocks }))
    }
  }

  const addRow = (key: RowSection) => {
    const added = newRow(key)
    setJustAdded(added.id)
    update((current) => ({ ...current, [key]: [...current[key], added] }))
    go(key, added.id)
  }

  const moveRow = (key: RowSection, index: number, by: -1 | 1) => {
    update((current) => {
      const list = [...current[key]]
      const to = index + by
      if (to < 0 || to >= list.length) return current
      ;[list[index], list[to]] = [list[to], list[index]]
      return { ...current, [key]: list }
    })
  }

  const deleteRow = (key: RowSection, index: number) => {
    const removed = latest.current[key][index]
    if (!removed) return
    const name =
      rowName(key, skeleton, index) ||
      `Untitled ${ROW_SECTION_CONFIG[key].noun}`
    update((current) => ({
      ...current,
      [key]: current[key].filter((r) => r.id !== removed.id),
    }))
    const next =
      latest.current[key][Math.min(index, latest.current[key].length - 1)]
    go(key, next?.id ?? null)
    toast.add({
      title: `Deleted ${name}`,
      actionProps: {
        children: "Undo",
        onClick: () => {
          update((current) => {
            const list = [...current[key]]
            list.splice(Math.min(index, list.length), 0, removed)
            return { ...current, [key]: list }
          })
          go(key, removed.id)
        },
      },
    })
  }

  const sectionIssues = issues.filter((issue) => {
    const target = issueTarget(issue)
    if (target.section !== section) return false
    if (rows) return target.row === null || target.row === rowIndex
    return true
  })
  const blocking = issues.filter((issue) => issue.blocksPlay).length

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ShellBreadcrumbs items={worldCrumbs(world, "Skeleton")} />
      <ShellActions>
        <SaveIndicator
          status={status}
          confirmKey={confirmKey}
          onSaveNow={() => {
            setConfirmKey((n) => n + 1)
            void autosave.flush()
          }}
        />
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href={worldHref(world.id)} />}
              />
            }
          >
            <PlayIcon data-icon="inline-start" aria-hidden />
            {blocking === 0 ? "Play" : `${blocking} to fix`}
          </TooltipTrigger>
          <TooltipContent>
            {blocking === 0
              ? "This World is playable. Go to its Sessions."
              : "Issues that stop a Session from starting. Each is marked on its section."}
          </TooltipContent>
        </Tooltip>
      </ShellActions>

      <div className="flex min-h-0 flex-1 flex-col md:grid md:grid-cols-[12rem_15rem_minmax(0,1fr)]">
        <SectionNav
          current={section}
          document={document}
          issues={issues}
          onPick={(key) => go(key)}
        />

        {rows ? (
          <RowList
            section={section as RowSection}
            rows={rows.map((r, index) => ({
              id: r.id,
              name: rowName(section as RowSection, skeleton, index),
            }))}
            current={row?.id ?? null}
            issues={issues}
            writerMayInventEndings={document.writerMayInventEndings}
            onWriterMayInventEndings={(on) =>
              update((current) => ({ ...current, writerMayInventEndings: on }))
            }
            onPick={(id) => go(section, id)}
            onAdd={() => addRow(section as RowSection)}
            onMove={(index, by) => moveRow(section as RowSection, index, by)}
            onDelete={(index) => deleteRow(section as RowSection, index)}
          />
        ) : null}

        <section
          aria-label={sectionTitle(section)}
          className={cn(
            "min-w-0 border-t px-2 py-6 md:border-t-0 md:border-l",
            !rows && "md:col-span-2"
          )}
        >
          <IssueList issues={sectionIssues} />
          {rows && !row ? (
            <Empty className="mx-4 mt-6 border">
              <EmptyHeader>
                <EmptyTitle>
                  No{" "}
                  {ROW_SECTION_CONFIG[
                    section as RowSection
                  ].title.toLowerCase()}{" "}
                  yet
                </EmptyTitle>
                <EmptyDescription>
                  Add the first {ROW_SECTION_CONFIG[section as RowSection].noun}
                  ; it opens here with every field ready to fill.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button onClick={() => addRow(section as RowSection)}>
                  <PlusIcon data-icon="inline-start" aria-hidden />
                  Add {ROW_SECTION_CONFIG[section as RowSection].noun}
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <DocumentEditor
              key={row ? row.id : section}
              initialBlocks={
                row
                  ? row.blocks
                  : document[section as Exclude<SectionKey, RowSection>]
              }
              onChange={onBlocks}
              namePlaceholder={
                row
                  ? ROW_SECTION_CONFIG[section as RowSection].namePlaceholder
                  : undefined
              }
              autoFocus={row !== null && row.id === justAdded}
              label={
                row
                  ? `${ROW_SECTION_CONFIG[section as RowSection].noun}: ${rowName(section as RowSection, skeleton, rowIndex ?? 0) || "untitled"}`
                  : sectionTitle(section)
              }
              className="max-w-4xl"
            />
          )}
          <p className="px-12 pt-6 text-xs text-muted-foreground">
            Start a line with a label and a colon to fill that field. Select
            text and press {shortcutKeys(HIDDEN_SHORTCUT).join("+")} to mark it
            Hidden: the Writer never states it outright.{" "}
            {title ? null : "The World takes its name from the Story's Title."}
          </p>
        </section>
      </div>
    </div>
  )
}

function rowName(
  section: RowSection,
  skeleton: ReturnType<typeof documentToSkeleton>["skeleton"],
  index: number
) {
  const item = skeleton[section][index] as Record<string, unknown> | undefined
  const value = item?.[ROW_SECTION_CONFIG[section].nameKey]
  return typeof value === "string" ? plainText(value).trim() : ""
}

function issueMarks(issues: readonly SkeletonIssue[]) {
  const blocking = issues.some((issue) => issue.blocksPlay)
  if (issues.length === 0) return null
  return (
    <CircleAlertIcon
      aria-label={blocking ? "Has issues that stop play" : "Has notes"}
      className={cn(
        "size-3.5 shrink-0",
        blocking ? "text-destructive" : "text-muted-foreground"
      )}
    />
  )
}

function SectionNav({
  current,
  document,
  issues,
  onPick,
}: {
  current: SectionKey
  document: SkeletonDocument
  issues: readonly SkeletonIssue[]
  onPick: (key: SectionKey) => void
}) {
  return (
    <nav
      aria-label="Skeleton sections"
      className="flex flex-col gap-0.5 px-3 py-6 md:sticky md:top-14 md:h-[calc(100svh-3.5rem)] md:overflow-y-auto"
    >
      {SECTION_ORDER.map((key) => {
        const own = issues.filter((issue) => issueTarget(issue).section === key)
        return (
          <button
            key={key}
            type="button"
            onClick={() => onPick(key)}
            aria-current={current === key ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
              current === key && "bg-muted font-medium"
            )}
          >
            <span className="flex-1 truncate">{sectionTitle(key)}</span>
            {issueMarks(own)}
            {isRowSection(key) ? (
              <span className="text-xs text-muted-foreground tabular-nums">
                {document[key].length}
              </span>
            ) : null}
          </button>
        )
      })}
    </nav>
  )
}

function RowList({
  section,
  rows,
  current,
  issues,
  writerMayInventEndings,
  onWriterMayInventEndings,
  onPick,
  onAdd,
  onMove,
  onDelete,
}: {
  section: RowSection
  rows: { id: string; name: string }[]
  current: string | null
  issues: readonly SkeletonIssue[]
  writerMayInventEndings: boolean
  onWriterMayInventEndings: (on: boolean) => void
  onPick: (id: string) => void
  onAdd: () => void
  onMove: (index: number, by: -1 | 1) => void
  onDelete: (index: number) => void
}) {
  const config = ROW_SECTION_CONFIG[section]
  return (
    <section
      aria-label={config.title}
      className="flex flex-col gap-2 border-t px-3 py-6 md:sticky md:top-14 md:h-[calc(100svh-3.5rem)] md:overflow-y-auto md:border-t-0 md:border-l"
    >
      <div className="flex items-center justify-between gap-2 px-2">
        <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {config.title}
        </h2>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onAdd}
                aria-label={`Add ${config.noun}`}
              />
            }
          >
            <PlusIcon aria-hidden />
          </TooltipTrigger>
          <TooltipContent>Add {config.noun}</TooltipContent>
        </Tooltip>
      </div>
      <ol className="flex flex-col gap-0.5">
        {rows.map((row, index) => {
          const own = issues.filter((issue) => {
            const target = issueTarget(issue)
            return target.section === section && target.row === index
          })
          return (
            <li
              key={row.id}
              className={cn(
                "group flex items-center rounded-md hover:bg-muted",
                current === row.id && "bg-muted"
              )}
            >
              <button
                type="button"
                onClick={() => onPick(row.id)}
                aria-current={current === row.id ? "true" : undefined}
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  current === row.id && "font-medium",
                  !row.name && "text-muted-foreground"
                )}
              >
                {section === "arcs" ? (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {index + 1}
                  </span>
                ) : null}
                <span className="flex-1 truncate">
                  {row.name || `Untitled ${config.noun}`}
                </span>
                {issueMarks(own)}
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Actions for ${row.name || `untitled ${config.noun}`}`}
                      className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-popup-open:opacity-100"
                    />
                  }
                >
                  <EllipsisIcon aria-hidden />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-auto min-w-40">
                  <DropdownMenuItem
                    disabled={index === 0}
                    onClick={() => onMove(index, -1)}
                  >
                    <ArrowUpIcon aria-hidden />
                    Move up
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={index === rows.length - 1}
                    onClick={() => onMove(index, 1)}
                  >
                    <ArrowDownIcon aria-hidden />
                    Move down
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => onDelete(index)}
                  >
                    <Trash2Icon aria-hidden />
                    Delete {config.noun}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          )
        })}
      </ol>
      <Button
        variant="ghost"
        size="sm"
        className="justify-start"
        onClick={onAdd}
      >
        <PlusIcon data-icon="inline-start" aria-hidden />
        Add {config.noun}
      </Button>
      {section === "endings" ? (
        <Field
          orientation="horizontal"
          className="mt-auto items-start px-2 pt-4"
        >
          <Switch
            id="writer-may-invent-endings"
            checked={writerMayInventEndings}
            onCheckedChange={onWriterMayInventEndings}
          />
          <div className="flex flex-col gap-1">
            <FieldLabel htmlFor="writer-may-invent-endings">
              Writer may invent endings
            </FieldLabel>
            <FieldDescription>
              Off: a Session ends only on an Ending listed here.
            </FieldDescription>
          </div>
        </Field>
      ) : null}
    </section>
  )
}

function IssueList({ issues }: { issues: readonly SkeletonIssue[] }) {
  if (issues.length === 0) return null
  const blocking = issues.some((issue) => issue.blocksPlay)
  return (
    <Alert
      variant={blocking ? "destructive" : "default"}
      className="mx-12 mb-4 w-auto max-w-3xl"
    >
      <CircleAlertIcon aria-hidden />
      <AlertTitle>
        {blocking ? "Fix before playing" : "Worth a look"}
      </AlertTitle>
      <AlertDescription>
        <ul className="list-disc pl-4">
          {issues.map((issue) => (
            <li key={`${issue.path}-${issue.message}`}>{issue.message}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  )
}

function PageSkeleton() {
  return (
    <div
      className="grid flex-1 grid-cols-1 md:grid-cols-[12rem_15rem_minmax(0,1fr)]"
      aria-busy="true"
      aria-label="Loading the Skeleton"
    >
      <div className="hidden flex-col gap-2 px-3 py-6 md:flex">
        {Array.from({ length: 11 }, (_, i) => (
          <Skeleton key={i} className="h-7 w-full" />
        ))}
      </div>
      <div className="hidden flex-col gap-2 border-l px-3 py-6 md:flex">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-7 w-full" />
        ))}
      </div>
      <div className="flex flex-col gap-3 border-l px-14 py-8">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-5 w-full max-w-md" />
        <Skeleton className="h-5 w-3/4 max-w-sm" />
      </div>
    </div>
  )
}
