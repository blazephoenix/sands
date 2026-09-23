"use client"

/**
 * One Entry in the setup review: its heading, why setup drafted it, the
 * Judge's flag, its fields, and Approve (↵) / Edit (E) / Remove (⌫). Edit
 * opens the Entry in the shared Entry editor inside the card; saving sets the
 * Entry `edited`.
 */
import * as React from "react"
import {
  CheckIcon,
  FlagIcon,
  Link2OffIcon,
  PencilIcon,
  RotateCcwIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react"

import { ENTRY_KIND_ICONS } from "@/components/codex/entry-badges"
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Kbd } from "@/components/ui/kbd"
import { Spinner } from "@/components/ui/spinner"
import {
  ENTRY_KIND_LABELS,
  entryContentOf,
  entryContentSchema,
  type Entry,
  type EntryContent,
  type JevFlag,
} from "@/domain/entry"
import {
  EntryEditor,
  type EntryBlockConversion,
  type EntryEditorHandle,
} from "@/editor"
import { entryToBlocks } from "@/editor/entry-blocks"
import { readFieldLine } from "@/editor/field-line"
import type { SandsInline } from "@/editor/schema-config"
import { cn } from "@/lib/utils"
import { reviewDecision } from "@/setup/review"

import { decisionLook } from "./review-sidebar"
import { entryTitle, errorMessage, type ReviewAction } from "./use-setup-review"

const FLAG_RULE: Record<JevFlag["question"], string> = {
  contradiction: "Contradiction",
  period_fit: "Period fit",
}

export type EntryCardProps = {
  entry: Entry
  /** Every Entry of the World, for mentions. */
  entries: readonly Entry[]
  why: string | null
  editing: boolean
  onEditingChange: (editing: boolean) => void
  onDecide: (action: ReviewAction) => void
  onSave: (entryId: string, content: EntryContent) => Promise<void>
  /** Selects another Entry of the review, e.g. from a mention; false when it is not in the review. */
  onSelectEntry: (entryId: string) => boolean
  editButtonRef?: React.Ref<HTMLButtonElement>
}

export function EntryCard({
  entry,
  entries,
  why,
  editing,
  onEditingChange,
  onDecide,
  onSave,
  onSelectEntry,
  editButtonRef,
}: EntryCardProps) {
  const decision = reviewDecision(entry.status)
  const status = decisionLook(entry)
  const KindIcon = ENTRY_KIND_ICONS[entry.kind]
  const removed = decision === "removed"
  const approved = decision === "approved"

  return (
    <Card role="region" aria-labelledby="review-entry-title">
      <CardHeader>
        <CardDescription className="flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
          <KindIcon aria-hidden className="size-3.5" />
          {ENTRY_KIND_LABELS[entry.kind].singular}
        </CardDescription>
        <CardTitle
          id="review-entry-title"
          className={cn(
            "text-xl",
            removed && "text-muted-foreground line-through"
          )}
        >
          {entryTitle(entry)}
        </CardTitle>
        <CardAction>
          <Badge
            variant={
              removed ? "destructive" : approved ? "secondary" : "outline"
            }
          >
            <status.Icon data-icon="inline-start" aria-hidden />
            {status.label}
          </Badge>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {why ? (
          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
            Why setup drafted this: {why}
          </p>
        ) : null}
        <JudgeFlags flags={entry.jevFlags} />
        {editing ? (
          <EditEntry
            entry={entry}
            entries={entries}
            onSave={onSave}
            onDone={() => onEditingChange(false)}
          />
        ) : (
          <EntryFields
            entry={entry}
            entries={entries}
            onSelectEntry={onSelectEntry}
          />
        )}
      </CardContent>

      {editing ? null : (
        <CardFooter className="flex flex-col items-stretch gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={approved ? "secondary" : "default"}
              onClick={() => onDecide("approve")}
              disabled={removed}
            >
              <CheckIcon data-icon="inline-start" aria-hidden />
              {approved ? "Approved" : "Approve"}
              <Kbd aria-hidden>↵</Kbd>
            </Button>
            <Button
              ref={editButtonRef}
              variant="outline"
              onClick={() => onEditingChange(true)}
              disabled={removed}
            >
              <PencilIcon data-icon="inline-start" aria-hidden />
              Edit
              <Kbd aria-hidden>E</Kbd>
            </Button>
            {removed ? (
              <Button
                variant="outline"
                className="ml-auto"
                onClick={() => onDecide("restore")}
              >
                <RotateCcwIcon data-icon="inline-start" aria-hidden />
                Restore
                <Kbd aria-hidden>⌫</Kbd>
              </Button>
            ) : (
              <Button
                variant="destructive"
                className="ml-auto"
                onClick={() => onDecide("remove")}
              >
                <Trash2Icon data-icon="inline-start" aria-hidden />
                Remove
                <Kbd aria-hidden>⌫</Kbd>
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {removed ? "Restore it to approve or edit it. " : null}
            <Kbd>↑</Kbd> <Kbd>↓</Kbd> move through the list.
          </p>
        </CardFooter>
      )}
    </Card>
  )
}

function JudgeFlags({ flags }: { flags: readonly JevFlag[] }) {
  if (flags.length === 0) return null
  return (
    <>
      {flags.map((flag) => (
        <Alert key={`${flag.question}-${flag.prompt}`}>
          <FlagIcon aria-hidden />
          <AlertTitle>
            The Judge wasn&apos;t sure about this ({FLAG_RULE[flag.question]},{" "}
            {flag.probability.toFixed(2)})
          </AlertTitle>
          <AlertDescription>
            It asked: “{flag.prompt}” Check it before approving it.
          </AlertDescription>
        </Alert>
      ))}
    </>
  )
}

/** The Entry's fields as `Label: value` lines, read the same way the editor lays them out. */
function EntryFields({
  entry,
  entries,
  onSelectEntry,
}: {
  entry: Entry
  entries: readonly Entry[]
  onSelectEntry: (id: string) => boolean
}) {
  const byId = React.useMemo(
    () => new Map(entries.map((e) => [e.id, e])),
    [entries]
  )
  const lines = React.useMemo(
    () =>
      entryToBlocks(entry, { nameOf: (id) => byId.get(id)?.name })
        .slice(1)
        .flatMap((block) => {
          const line = readFieldLine(block)
          return line ? [{ id: block.id, line }] : []
        }),
    [entry, byId]
  )
  return (
    <div className="flex max-w-prose flex-col gap-1.5 leading-relaxed">
      {lines.map(({ id, line }) => (
        <p key={id} className="whitespace-pre-line">
          <span className="font-semibold">{line.label}:</span>{" "}
          {line.text.trim() ||
          line.value.some((node) => node.type === "entryMention") ? (
            <FieldValue
              value={line.value}
              hidden={line.hidden}
              byId={byId}
              onSelectEntry={onSelectEntry}
            />
          ) : (
            <span className="text-muted-foreground">Not set</span>
          )}
        </p>
      ))}
    </div>
  )
}

function FieldValue({
  value,
  hidden,
  byId,
  onSelectEntry,
}: {
  value: readonly SandsInline[]
  hidden: boolean
  byId: ReadonlyMap<string, Entry>
  onSelectEntry: (id: string) => boolean
}) {
  return (
    <span
      className={cn(hidden && "sands-hidden")}
      title={hidden ? "Hidden: the Writer never states this" : undefined}
    >
      {value.map((node, index) => {
        if (node.type === "text")
          return <React.Fragment key={index}>{node.text}</React.Fragment>
        if (node.type !== "entryMention") return null
        const target = byId.get(node.props.entryId)
        const broken = !target || target.status === "rejected"
        const name = target?.name || node.props.label || "Unknown Entry"
        const Icon = broken ? Link2OffIcon : ENTRY_KIND_ICONS[target.kind]
        const label = broken
          ? `${name} (${target ? "removed" : "no longer exists"})`
          : name
        return (
          <Badge
            key={index}
            variant={broken ? "outline" : "secondary"}
            className={cn(
              "mx-0.5 align-baseline",
              broken && "text-muted-foreground line-through"
            )}
            render={
              target && target.status !== "locked" ? (
                <button
                  type="button"
                  onClick={() => onSelectEntry(target.id)}
                />
              ) : undefined
            }
            aria-label={
              target && target.status !== "locked"
                ? `${label}. Show this Entry`
                : label
            }
          >
            <Icon data-icon="inline-start" aria-hidden />
            {name}
          </Badge>
        )
      })}
    </span>
  )
}

type SaveState =
  | { state: "idle" }
  | { state: "dirty" }
  | { state: "saving" }
  | { state: "saved" }
  | { state: "invalid"; message: string }
  | { state: "error"; message: string }

const SAVE_DELAY_MS = 700

/** Stable form of Entry content, to tell a real edit from the editor re-reading the same Entry. */
function contentKey(content: EntryContent) {
  return JSON.stringify(entryContentSchema.parse(content))
}

/**
 * The Entry in the shared Entry editor, autosaving. An edit is saved only
 * when its converted content differs from the stored Entry, so opening the
 * editor never marks an Entry `edited` by itself.
 */
function EditEntry({
  entry,
  entries,
  onSave,
  onDone,
}: {
  entry: Entry
  entries: readonly Entry[]
  onSave: (entryId: string, content: EntryContent) => Promise<void>
  onDone: () => void
}) {
  const editor = React.useRef<EntryEditorHandle | null>(null)
  const shown = React.useMemo(() => [entry], [entry])
  const [save, setSave] = React.useState<SaveState>({ state: "idle" })
  const unsaved = React.useRef<EntryContent | null>(null)
  const timer = React.useRef<number | undefined>(undefined)
  const stored = React.useRef(contentKey(entryContentOf(entry)))
  React.useEffect(() => {
    stored.current = contentKey(entryContentOf(entry))
  }, [entry])

  const flush = React.useCallback(async () => {
    window.clearTimeout(timer.current)
    const content = unsaved.current
    if (!content) return true
    unsaved.current = null
    setSave({ state: "saving" })
    try {
      await onSave(entry.id, content)
      setSave((now) => (now.state === "saving" ? { state: "saved" } : now))
      return true
    } catch (error) {
      unsaved.current ??= content
      setSave({ state: "error", message: errorMessage(error) })
      return false
    }
  }, [entry.id, onSave])

  const onChange = React.useCallback(
    (change: EntryBlockConversion) => {
      if (change.entryId !== entry.id) return
      window.clearTimeout(timer.current)
      if (!change.content) {
        unsaved.current = null
        setSave({
          state: "invalid",
          message: change.issues[0]?.message ?? "Fix the marked field to save.",
        })
        return
      }
      if (contentKey(change.content) === stored.current) {
        unsaved.current = null
        setSave((now) =>
          now.state === "invalid" || now.state === "dirty"
            ? { state: "idle" }
            : now
        )
        return
      }
      unsaved.current = change.content
      setSave({ state: "dirty" })
      timer.current = window.setTimeout(() => void flush(), SAVE_DELAY_MS)
    },
    [entry.id, flush]
  )

  // Put the cursor in the Entry once the editor has loaded.
  React.useEffect(() => {
    let frame = 0
    let tries = 0
    const focus = () => {
      const handle = editor.current
      if (handle?.editor()) {
        handle.focusEntry(entry.id)
        return
      }
      if (tries++ < 120) frame = requestAnimationFrame(focus)
    }
    frame = requestAnimationFrame(focus)
    return () => {
      cancelAnimationFrame(frame)
    }
    // Once per opening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Nothing typed is lost: warn before leaving with an unsaved edit, and save on close.
  const hasUnsaved =
    save.state === "dirty" ||
    save.state === "saving" ||
    save.state === "error" ||
    save.state === "invalid"
  React.useEffect(() => {
    if (!hasUnsaved) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener("beforeunload", warn)
    return () => {
      window.removeEventListener("beforeunload", warn)
    }
  }, [hasUnsaved])
  React.useEffect(
    () => () => {
      window.clearTimeout(timer.current)
      if (unsaved.current)
        void onSave(entry.id, unsaved.current).catch(() => {})
    },
    // On unmount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="-mx-2 rounded-lg border [&_.bn-block-outer:has(.sands-divider)]:hidden">
        <EntryEditor
          ref={editor}
          entries={shown}
          mentionEntries={entries}
          onEntryChange={onChange}
        />
      </div>
      {save.state === "error" ? (
        <Alert variant="destructive">
          <TriangleAlertIcon aria-hidden />
          <AlertTitle>Your edit isn&apos;t saved yet</AlertTitle>
          <AlertDescription>
            {save.message} What you typed is still here.
          </AlertDescription>
          <AlertAction>
            <Button variant="outline" size="sm" onClick={() => void flush()}>
              Retry
            </Button>
          </AlertAction>
        </Alert>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={async () => {
            if (save.state === "invalid") return
            if (await flush()) onDone()
          }}
          disabled={save.state === "saving" || save.state === "invalid"}
        >
          {save.state === "saving" ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <CheckIcon data-icon="inline-start" aria-hidden />
          )}
          Done editing
        </Button>
        <p role="status" className="text-sm text-muted-foreground">
          {save.state === "dirty"
            ? "Unsaved changes…"
            : save.state === "saving"
              ? "Saving…"
              : save.state === "saved"
                ? "Saved. This Entry is now marked edited."
                : save.state === "invalid"
                  ? `Not saved: ${save.message}`
                  : "Changes save as you type."}
        </p>
      </div>
    </div>
  )
}
