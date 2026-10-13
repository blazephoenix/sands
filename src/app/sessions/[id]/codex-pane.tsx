"use client"

/**
 * The Codex pane: this Session's copies of its World's Entries in
 * the shared Entry editor, with filters by source and status. Edits and status
 * changes save through `PATCH /api/entries/[id]` and apply from the next Turn.
 * Entries the Writer invented in play carry "new, Turn N" until seen here.
 *
 * Every change re-checks the Session's solvability (spec §7.2): a Gap shows
 * as a warning above the Entries, and the change is saved all the same. The
 * Location the Player stands in cannot be removed.
 */
import * as React from "react"
import { FilterXIcon, TriangleAlertIcon } from "lucide-react"

import { GapList } from "@/components/codex/gap-list"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { Field, FieldLabel } from "@/components/ui/field"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/toast"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { PatchEntryRequest, PatchEntryResponse } from "@/domain/api"
import {
  entryContentOf,
  type Entry,
  type EntryContent,
  type EntrySource,
  type EntryStatus,
} from "@/domain/entry"
import { turnLabel } from "@/domain/session"
import type { GetSessionResponse } from "@/domain/session-view"
import {
  EntryEditor,
  type BlockAction,
  type EntryBlockConversion,
  type EntryBlockInfo,
  type EntryEditorHandle,
} from "@/editor"
import { api, ApiError } from "@/lib/api-client"

import { mergeEntries } from "./use-session"
import { nowIso } from "@/lib/time"

const SOURCES: { value: EntrySource; label: string }[] = [
  { value: "author", label: "Author" },
  { value: "setup", label: "Setup" },
  { value: "play", label: "Play" },
]

/** UI wording for statuses: data says `accepted` / `rejected`, the Author reads Approved / Removed. */
const STATUSES: { value: Exclude<EntryStatus, "rejected">; label: string }[] = [
  { value: "locked", label: "Locked" },
  { value: "proposed", label: "Proposed" },
  { value: "accepted", label: "Approved" },
  { value: "edited", label: "Edited" },
]

const ALL_SOURCES = SOURCES.map((s) => s.value)
const ALL_STATUSES = STATUSES.map((s) => s.value)

/** How long an edit waits for more typing before it saves. */
const SAVE_DELAY_MS = 700

/** A play Entry the Author has not seen, or first saw since this pane opened, still shows its marker. */
function isNew(entry: Entry, openedAt: string) {
  return (
    entry.source === "play" &&
    (entry.seenAt === null || entry.seenAt >= openedAt)
  )
}

export function unseenPlayEntries(entries: readonly Entry[]) {
  return entries.filter(
    (entry) =>
      entry.source === "play" &&
      entry.seenAt === null &&
      entry.status !== "rejected"
  )
}

/** Compares two Entry contents regardless of key order. */
function sameContent(a: EntryContent, b: EntryContent) {
  const canonical = (value: unknown): unknown =>
    Array.isArray(value)
      ? value.map(canonical)
      : value && typeof value === "object"
        ? Object.fromEntries(
            Object.entries(value)
              .sort(([x], [y]) => x.localeCompare(y))
              .map(([k, v]) => [k, canonical(v)])
          )
        : value
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b))
}

function message(error: unknown) {
  return error instanceof ApiError
    ? error.message
    : "Something went wrong. Try again."
}

export function CodexPane({
  data,
  update,
  localEntries,
}: {
  data: GetSessionResponse
  update: (change: (data: GetSessionResponse) => GetSessionResponse) => void
  /** Entries with a save in flight; a poll keeps the page's copy of them. */
  localEntries: React.RefObject<Set<string>>
}) {
  const [sources, setSources] = React.useState<EntrySource[]>(ALL_SOURCES)
  const [statuses, setStatuses] = React.useState<EntryStatus[]>(ALL_STATUSES)
  const [showRemoved, setShowRemoved] = React.useState(false)
  const [openedAt] = React.useState(nowIso)
  const editorRef = React.useRef<EntryEditorHandle>(null)

  const entries = data.entries
  const byId = React.useMemo(
    () => new Map(entries.map((entry) => [entry.id, entry])),
    [entries]
  )
  const visible = React.useMemo(
    () =>
      entries.filter(
        (entry) =>
          sources.includes(entry.source) &&
          (entry.status === "rejected"
            ? showRemoved
            : statuses.includes(entry.status))
      ),
    [entries, sources, statuses, showRemoved]
  )
  const filtered =
    sources.length < ALL_SOURCES.length || statuses.length < ALL_STATUSES.length

  // The editor renders its Entries at mount: remount it when the filters change or play invents a new Entry.
  const playIds = entries
    .filter((entry) => entry.source === "play")
    .map((entry) => entry.id)
    .join(",")
  const editorKey = JSON.stringify([sources, statuses, showRemoved, playIds])

  // Which Entries the editor shows is fixed when it mounts, so an Entry removed or re-statused
  // in place stays in view (with Undo) instead of vanishing under the cursor.
  const [shown, setShown] = React.useState(() => ({
    key: editorKey,
    ids: new Set(visible.map((entry) => entry.id)),
  }))
  if (shown.key !== editorKey)
    setShown({ key: editorKey, ids: new Set(visible.map((entry) => entry.id)) })
  const [added, setAdded] = React.useState<ReadonlySet<string>>(new Set())
  const editorEntries = React.useMemo(
    () =>
      entries.filter((entry) => shown.ids.has(entry.id) || added.has(entry.id)),
    [entries, shown, added]
  )

  const setEntry = React.useCallback(
    (entry: Entry) =>
      update((current) => ({
        ...current,
        entries: mergeEntries(current.entries, [entry]),
      })),
    [update]
  )
  /** A saved change: the Entry as stored, and the Session's solvability re-checked after it. */
  const setSaved = React.useCallback(
    ({ entry, solvability }: PatchEntryResponse) =>
      update((current) => ({
        ...current,
        entries: mergeEntries(current.entries, [entry]),
        solvability: solvability ?? current.solvability,
      })),
    [update]
  )

  /** Where the Player stands after the latest Turn: that Location cannot be removed. */
  const playerLocationId = data.turns.at(-1)?.state.locationId ?? null

  // Seen: play Entries shown here are marked seen on the server. Their marker stays until the pane closes.
  const marking = React.useRef(new Set<string>())
  React.useEffect(() => {
    for (const entry of editorEntries) {
      if (
        entry.source !== "play" ||
        entry.seenAt !== null ||
        marking.current.has(entry.id)
      )
        continue
      marking.current.add(entry.id)
      api
        .patchEntry(entry.id, { action: "mark-seen" })
        .then(({ entry: saved }) => setEntry(saved))
        .catch(() => marking.current.delete(entry.id))
    }
  }, [editorEntries, setEntry])

  const entryLabelNote = React.useCallback(
    (info: EntryBlockInfo) => {
      const entry = byId.get(info.entryId)
      return entry && isNew(entry, openedAt) && entry.sourceTurn !== null
        ? `new, ${turnLabel({ idx: entry.sourceTurn })}`
        : null
    },
    [byId, openedAt]
  )

  // Status changes: optimistic, with Undo; a failure rolls back and says why.
  const changeStatus = React.useCallback(
    (
      info: EntryBlockInfo,
      request: PatchEntryRequest,
      next: EntryStatus,
      verb: string,
      undo: PatchEntryRequest | null
    ) => {
      const entry = byId.get(info.entryId)
      if (!entry) return
      const name = info.name || entry.name || "Entry"
      const toastId = `codex-status-${entry.id}`
      setEntry({ ...entry, status: next } as Entry)
      api
        .patchEntry(entry.id, request)
        .then((response) => {
          const saved = response.entry
          setSaved(response)
          toast.add({
            id: toastId,
            title: `${name} ${verb}`,
            description: "It applies from the next Turn.",
            actionProps: undo
              ? {
                  children: "Undo",
                  onClick: () => {
                    setEntry(
                      saved.status === entry.status
                        ? saved
                        : ({ ...saved, status: entry.status } as Entry)
                    )
                    api
                      .patchEntry(entry.id, undo)
                      .then((response) => {
                        setSaved(response)
                        toast.add({
                          id: toastId,
                          title: `${name} is back as it was`,
                          description: "It applies from the next Turn.",
                          actionProps: undefined,
                        })
                      })
                      .catch((error: unknown) => {
                        setEntry(saved)
                        toast.add({
                          id: toastId,
                          type: "error",
                          title: "Undo did not go through",
                          description: message(error),
                        })
                      })
                  },
                }
              : undefined,
          })
        })
        .catch((error: unknown) => {
          setEntry(entry)
          toast.add({
            id: toastId,
            type: "error",
            title: `${name} was not ${verb}`,
            description: message(error),
          })
        })
    },
    [byId, setEntry, setSaved]
  )

  const entryActions = React.useCallback(
    (info: EntryBlockInfo): BlockAction[] => {
      if (!info.entryId || info.status === "locked") return []
      const previous = info.status
      const undoTo: PatchEntryRequest =
        previous === "rejected"
          ? { action: "reject" }
          : { action: "restore", status: previous }
      if (info.status === "rejected") {
        return [
          {
            id: "restore",
            label: "Restore",
            run: () =>
              changeStatus(
                info,
                { action: "restore", status: "proposed" },
                "proposed",
                "restored",
                undoTo
              ),
          },
        ]
      }
      return [
        {
          id: "approve",
          label: "Approve",
          disabled: info.status === "accepted",
          run: () =>
            changeStatus(
              info,
              { action: "accept" },
              "accepted",
              "approved",
              undoTo
            ),
        },
        info.entryId === playerLocationId
          ? {
              id: "remove",
              label: "Remove (the Player is here)",
              disabled: true,
              run: () => {},
            }
          : {
              id: "remove",
              label: "Remove",
              destructive: true,
              run: () =>
                changeStatus(
                  info,
                  { action: "reject" },
                  "rejected",
                  "removed",
                  undoTo
                ),
            },
      ]
    },
    [changeStatus, playerLocationId]
  )

  // Edits: saved per Entry once typing pauses. The page keeps the edited copy, so nothing typed is lost on failure.
  const pending = React.useRef(
    new Map<
      string,
      { content: EntryContent; timer: ReturnType<typeof setTimeout> | null }
    >()
  )
  const creating = React.useRef(new Set<string>())

  const retry = React.useRef<(id: string) => void>(() => {})
  const save = React.useCallback(
    (id: string) => {
      const item = pending.current.get(id)
      if (!item) return
      item.timer = null
      const { content } = item
      const toastId = `codex-saved-${id}`
      api
        .patchEntry(id, { action: "edit", content })
        .then((response) => {
          const { entry } = response
          // A newer edit may have arrived meanwhile; it saves on its own.
          if (pending.current.get(id)?.content === content) {
            pending.current.delete(id)
            localEntries.current.delete(id)
            setSaved(response)
          }
          toast.add({
            id: toastId,
            title: `${entry.name || "Entry"} saved`,
            description: "It applies from the next Turn.",
          })
        })
        .catch((error: unknown) => {
          toast.add({
            id: toastId,
            type: "error",
            timeout: 0,
            title: `${content.name || "The Entry"} was not saved`,
            description: `${message(error)} Your edit is still here.`,
            actionProps: {
              children: "Try again",
              onClick: () => retry.current(id),
            },
          })
        })
    },
    [localEntries, setSaved]
  )
  React.useEffect(() => {
    retry.current = save
  }, [save])

  const onEntryChange = React.useCallback(
    (change: EntryBlockConversion) => {
      const content = change.content
      if (!content) return // The editor shows what is wrong inline; it saves once the Entry is valid.

      if (!change.entryId) {
        // A new Entry from the slash menu: store it in this Session's Codex only.
        if (creating.current.has(change.blockId)) return
        creating.current.add(change.blockId)
        api
          .createEntry({
            worldId: data.world.id,
            sessionId: data.session.id,
            content,
          })
          .then((response) => {
            const { entry } = response
            editorRef.current?.assignEntryId(change.blockId, entry.id)
            setAdded((ids) => new Set([...ids, entry.id]))
            setSaved(response)
            toast.add({
              title: `${entry.name || "Entry"} added`,
              description: "It applies from the next Turn.",
            })
          })
          .catch((error: unknown) => {
            creating.current.delete(change.blockId)
            toast.add({
              type: "error",
              title: "The new Entry was not added",
              description: `${message(error)} Edit it again to retry.`,
            })
          })
        return
      }

      const id = change.entryId
      const entry = byId.get(id)
      if (!entry || entry.status === "locked") return
      // BlockNote rewrites a loaded document (key order, default props) and reports it; only real edits save.
      if (
        !pending.current.has(id) &&
        sameContent(content, entryContentOf(entry))
      )
        return
      localEntries.current.add(id)
      setEntry({
        ...entry,
        ...content,
        status: entry.status === "rejected" ? entry.status : "edited",
      } as Entry)
      const item = pending.current.get(id)
      if (item?.timer) clearTimeout(item.timer)
      pending.current.set(id, {
        content,
        timer: setTimeout(() => save(id), SAVE_DELAY_MS),
      })
    },
    [
      byId,
      data.session.id,
      data.world.id,
      localEntries,
      save,
      setEntry,
      setSaved,
    ]
  )

  // Closing the pane saves what is still waiting.
  React.useEffect(() => {
    const waiting = pending.current
    return () => {
      for (const [id, item] of waiting) {
        if (item.timer) {
          clearTimeout(item.timer)
          save(id)
        }
      }
    }
  }, [save])

  const reset = () => {
    setSources(ALL_SOURCES)
    setStatuses(ALL_STATUSES)
  }
  const count = (predicate: (entry: Entry) => boolean) =>
    entries.filter(predicate).length
  const removedCount = count((entry) => entry.status === "rejected")

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-col gap-3 border-b px-4 pb-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <ToggleGroup
            multiple
            variant="outline"
            size="sm"
            spacing={0}
            value={sources}
            onValueChange={(value) => setSources(value as EntrySource[])}
            aria-label="Filter by source"
          >
            {SOURCES.map((source) => (
              <ToggleGroupItem key={source.value} value={source.value}>
                {source.label}
                <span className="text-muted-foreground tabular-nums">
                  {count((entry) => entry.source === source.value)}
                </span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <ToggleGroup
            multiple
            variant="outline"
            size="sm"
            spacing={0}
            value={statuses}
            onValueChange={(value) => setStatuses(value as EntryStatus[])}
            aria-label="Filter by status"
          >
            {STATUSES.map((status) => (
              <ToggleGroupItem key={status.value} value={status.value}>
                {status.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <Field orientation="horizontal" className="w-auto">
          <Switch
            id="codex-show-removed"
            checked={showRemoved}
            onCheckedChange={setShowRemoved}
          />
          <FieldLabel htmlFor="codex-show-removed" className="font-normal">
            Show removed Entries{" "}
            <span className="text-muted-foreground tabular-nums">
              ({removedCount})
            </span>
          </FieldLabel>
        </Field>
      </div>

      {data.solvability.passed ? null : (
        <div className="border-b px-4 py-3">
          <Alert>
            <TriangleAlertIcon aria-hidden />
            <AlertTitle>
              This Session can&apos;t be won as its Codex stands
            </AlertTitle>
            <AlertDescription>
              <p>Your changes are saved. Fix these Gaps to keep it winnable:</p>
              <GapList
                gaps={data.solvability.gaps}
                canSelect={(id) =>
                  editorEntries.some((entry) => entry.id === id)
                }
                onSelect={(id) => editorRef.current?.focusEntry(id)}
              />
            </AlertDescription>
          </Alert>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto py-2">
        {editorEntries.length === 0 ? (
          <Empty className="py-12">
            <EmptyHeader>
              <EmptyTitle>No Entries match these filters</EmptyTitle>
              <EmptyDescription>
                Turn a source or status back on to see its Entries.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button
                variant="outline"
                size="sm"
                onClick={reset}
                disabled={!filtered}
              >
                <FilterXIcon data-icon="inline-start" />
                Show every Entry
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <EntryEditor
            key={editorKey}
            ref={editorRef}
            entries={editorEntries}
            entryActions={entryActions}
            entryLabelNote={entryLabelNote}
            onEntryChange={onEntryChange}
          />
        )}
      </div>
    </div>
  )
}
