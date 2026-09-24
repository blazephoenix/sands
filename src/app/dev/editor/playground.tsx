"use client"

import * as React from "react"
import { RotateCcwIcon, TriangleAlertIcon } from "lucide-react"

import { ShellActions, ShellBreadcrumbs } from "@/components/app-shell"
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/toast"
import type { GetWorldResponse } from "@/domain/api"
import type { Entry, EntryStatus } from "@/domain/entry"
import {
  BriefEditor,
  EditorSkeleton,
  EntryEditor,
  type BlockAction,
  type BriefEditorChange,
  type EntryBlockConversion,
  type EntryBlockInfo,
} from "@/editor"
import type { SandsBlock } from "@/editor/schema-config"
import { api, ApiError } from "@/lib/api-client"

type Load =
  | { state: "loading" }
  | { state: "error"; error: ApiError }
  | { state: "ready"; data: GetWorldResponse }

/** The World named by `?world=`, else the most recently updated one. */
async function loadWorld(
  worldId: string | null,
  signal: AbortSignal
): Promise<GetWorldResponse> {
  if (worldId) return api.getWorld(worldId, signal)
  const { worlds } = await api.listWorlds(signal)
  const latest = worlds[0]
  if (!latest)
    throw new ApiError(
      404,
      "not_found",
      "There are no Worlds yet. Create one from the Worlds home, then come back."
    )
  return api.getWorld(latest.id, signal)
}

export function EditorPlayground({ worldId }: { worldId: string | null }) {
  const [load, setLoad] = React.useState<Load>({ state: "loading" })
  const [attempt, setAttempt] = React.useState(0)
  const [readOnly, setReadOnly] = React.useState(false)
  const [version, setVersion] = React.useState(0)

  React.useEffect(() => {
    const controller = new AbortController()
    loadWorld(worldId, controller.signal)
      .then((data) => setLoad({ state: "ready", data }))
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.code === "aborted") return
        setLoad({
          state: "error",
          error:
            error instanceof ApiError
              ? error
              : new ApiError(0, "internal", "Loading failed. Try again."),
        })
      })
    return () => controller.abort()
  }, [worldId, attempt])

  return (
    <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-6 px-4 py-6">
      <ShellBreadcrumbs
        items={[{ label: "Dev" }, { label: "Editor playground" }]}
      />
      <ShellActions>
        <Field orientation="horizontal" className="w-auto">
          <Switch
            id="playground-read-only"
            checked={readOnly}
            onCheckedChange={setReadOnly}
          />
          <FieldLabel htmlFor="playground-read-only" className="font-normal">
            Read-only
          </FieldLabel>
        </Field>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setVersion((v) => v + 1)}
        >
          <RotateCcwIcon data-icon="inline-start" />
          Reset editors
        </Button>
      </ShellActions>

      <div className="flex max-w-prose flex-col gap-1">
        <h1 className="font-heading text-xl font-semibold tracking-tight">
          Editor playground
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          The Brief and the Codex of one World, in the shared editor: the one
          named by ?world= in the address, else the most recently updated. Type
          / for sections, select text for the Hidden eye, press Ctrl+/ (⌘/ on a
          Mac) for the block menu, type @ in an Entry field to mention one.
          Edits stay in this page.
        </p>
      </div>

      {load.state === "error" ? (
        <Alert variant="destructive">
          <TriangleAlertIcon />
          <AlertTitle>The World did not load</AlertTitle>
          <AlertDescription>{load.error.message}</AlertDescription>
          <AlertAction>
            <Button
              variant="outline"
              size="sm"
              onClick={() => (
                setLoad({ state: "loading" }),
                setAttempt((a) => a + 1)
              )}
            >
              Retry
            </Button>
          </AlertAction>
        </Alert>
      ) : null}

      <div className="grid gap-8 xl:grid-cols-2">
        <section
          aria-labelledby="brief-surface"
          className="flex min-w-0 flex-col gap-3"
        >
          <h2
            id="brief-surface"
            className="text-sm font-medium text-muted-foreground"
          >
            Brief surface
          </h2>
          {load.state === "ready" ? (
            <BriefPane
              key={version}
              document={load.data.world.briefDoc as SandsBlock[]}
              readOnly={readOnly}
            />
          ) : (
            <EditorSkeleton sections={4} />
          )}
        </section>
        <section
          aria-labelledby="entry-surface"
          className="flex min-w-0 flex-col gap-3"
        >
          <h2
            id="entry-surface"
            className="text-sm font-medium text-muted-foreground"
          >
            Entry surface
          </h2>
          {load.state === "ready" ? (
            <EntryPane
              key={version}
              entries={load.data.entries}
              readOnly={readOnly}
            />
          ) : (
            <EditorSkeleton sections={4} />
          )}
        </section>
      </div>
    </div>
  )
}

function Output({
  title,
  value,
  counts,
}: {
  title: string
  value: unknown
  counts: React.ReactNode
}) {
  return (
    <details className="rounded-lg border">
      <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm font-medium">
        {title}
        {counts}
      </summary>
      <pre className="max-h-96 overflow-auto border-t px-3 py-2 font-mono text-xs leading-relaxed">
        {JSON.stringify(value, null, 2)}
      </pre>
    </details>
  )
}

function BriefPane({
  document,
  readOnly,
}: {
  document: SandsBlock[]
  readOnly: boolean
}) {
  const [change, setChange] = React.useState<BriefEditorChange | null>(null)
  const conversion = change?.conversion
  return (
    <>
      <div className="min-h-96 rounded-lg border py-2">
        <BriefEditor
          initialDocument={document}
          readOnly={readOnly}
          onChange={setChange}
        />
      </div>
      <Output
        title="Converted Brief"
        value={
          conversion
            ? {
                issues: conversion.issues,
                warnings: conversion.warnings,
                brief: conversion.draft,
              }
            : "Edit the Brief to see its conversion."
        }
        counts={
          conversion ? (
            <>
              <Badge
                variant={
                  conversion.issues.length > 0 ? "destructive" : "secondary"
                }
              >
                {conversion.issues.length} issues
              </Badge>
              <Badge variant="outline">
                {conversion.warnings.length} warnings
              </Badge>
            </>
          ) : null
        }
      />
    </>
  )
}

function EntryPane({
  entries: initial,
  readOnly,
}: {
  entries: Entry[]
  readOnly: boolean
}) {
  const [entries, setEntries] = React.useState(initial)
  const [changes, setChanges] = React.useState<
    Record<string, EntryBlockConversion>
  >({})

  const setStatus = React.useCallback(
    (info: EntryBlockInfo, status: EntryStatus, verb: string) => {
      const previous = info.status
      setEntries((all) =>
        all.map((entry) =>
          entry.id === info.entryId ? { ...entry, status } : entry
        )
      )
      toast.add({
        title: `${info.name || "Entry"} ${verb}`,
        actionProps: {
          children: "Undo",
          onClick: () =>
            setEntries((all) =>
              all.map((entry) =>
                entry.id === info.entryId
                  ? { ...entry, status: previous }
                  : entry
              )
            ),
        },
      })
    },
    []
  )

  const entryActions = React.useCallback(
    (info: EntryBlockInfo): BlockAction[] => {
      if (!info.entryId || info.status === "locked") return []
      if (info.status === "rejected")
        return [
          {
            id: "restore",
            label: "Restore",
            run: () => setStatus(info, "proposed", "restored"),
          },
        ]
      return [
        {
          id: "accept",
          label: "Accept",
          disabled: info.status === "accepted",
          run: () => setStatus(info, "accepted", "accepted"),
        },
        {
          id: "reject",
          label: "Reject",
          destructive: true,
          run: () => setStatus(info, "rejected", "rejected"),
        },
      ]
    },
    [setStatus]
  )

  const list = Object.values(changes)
  return (
    <>
      <div className="min-h-96 rounded-lg border py-2">
        <EntryEditor
          entries={entries}
          readOnly={readOnly}
          entryActions={entryActions}
          onEntryChange={(change) =>
            setChanges((all) => ({ ...all, [change.blockId]: change }))
          }
        />
      </div>
      <Output
        title="Changed Entries"
        value={
          list.length > 0
            ? list
            : "Edit an Entry to see it converted and validated."
        }
        counts={<Badge variant="secondary">{list.length} changed</Badge>}
      />
    </>
  )
}
