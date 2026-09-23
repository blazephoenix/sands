"use client"

/**
 * The Entry surface (spec §7.2): setup review and the Codex pane. One section
 * per Entry, under World and Story logic dividers, with `@` mentions between
 * them.
 *
 * Data flow:
 * - `entries` is rendered at mount. Afterwards only heading metadata (status,
 *   source, Jev flags) follows the prop, so optimistic Accept / Reject shows at
 *   once. To show a different set of Entries (a filter), remount with a new `key`.
 * - Content edits flow out through `onEntryChange`, once per changed section,
 *   converted and validated. Locked Entries never report changes. A section
 *   the Author just added has an empty `entryId`; after storing it, call
 *   `assignEntryId`.
 * - Accept, Reject and Restore are the page's: pass them as `entryActions`;
 *   they appear in the heading's ⠿ menu and in the keyboard block menu (`Mod-/`).
 */
import * as React from "react"

import type { Entry, EntryKind } from "@/domain/entry"

import { entryBlockInfo } from "./blocks/section-headings"
import { ALLOW_LOCKED_META, flashBlock, focusBlock, sectionOf, type SandsEditor } from "./commands"
import { buildEntryIndex, indexAnnotations, type BlockAction, type EntryBlockInfo, type EntrySummary } from "./editor-context"
import { documentToEntries, entriesToDocument, entryBlocksOf, type EntryBlockConversion } from "./entry-blocks"
import { SandsEditorView } from "./sands-editor-view"
import { isEntryBlockType, type EntryBlock, type SandsBlock } from "./schema-config"

export type EntryEditorHandle = {
  editor: () => SandsEditor | null
  /** Scrolls to an Entry, puts the cursor in its name and briefly highlights it. */
  focusEntry: (entryId: string) => void
  /** Scrolls to and highlights an Entry without moving the cursor. */
  revealEntry: (entryId: string) => void
  /** Gives a newly stored Entry its server id. */
  assignEntryId: (blockId: string, entryId: string) => void
  /** The Entry holding the cursor (its heading or one of its fields), if any: for `a` / `r` shortcuts. */
  focusedEntry: () => EntryBlockInfo | null
}

export type EntryEditorProps = {
  entries: readonly Entry[]
  /**
   * More Entries that `@` mentions may resolve to, without being shown: e.g.
   * the rest of the Codex when the editor holds one Entry. Rejected ones
   * render as broken mentions, as usual.
   */
  mentionEntries?: readonly Entry[]
  readOnly?: boolean
  /** Accept, Reject, Restore: shown in each Entry heading's ⠿ menu and keyboard block menu. */
  entryActions?: (entry: EntryBlockInfo) => BlockAction[]
  /** A short plain-text note for an Entry's label line, e.g. "new, Turn 5". */
  entryLabelNote?: (entry: EntryBlockInfo) => string | null
  onEntryChange?: (change: EntryBlockConversion) => void
  className?: string
  ref?: React.Ref<EntryEditorHandle>
}

function headingForEntry(editor: SandsEditor, entryId: string): EntryBlock | undefined {
  const direct = editor.getBlock(entryId) as SandsBlock | undefined
  if (direct && isEntryBlockType(direct.type)) return direct as EntryBlock
  return entryBlocksOf(editor.document as SandsBlock[]).find((block) => block.props.entryId === entryId)
}

/** What counts as an edit: content and issues, not heading metadata. */
function fingerprint(conversion: EntryBlockConversion) {
  return JSON.stringify([conversion.entryId, conversion.content, conversion.issues])
}

export function EntryEditor({ entries, mentionEntries, readOnly, entryActions, entryLabelNote, onEntryChange, className, ref }: EntryEditorProps) {
  const editorRef = React.useRef<SandsEditor | null>(null)
  const [initialContent] = React.useState(() => entriesToDocument(entries))
  const [live, setLive] = React.useState<EntryBlockConversion[]>(() => documentToEntries(initialContent))
  const kindOfRef = React.useRef(new Map<string, EntryKind>())
  const lastSeen = React.useRef(new Map<string, string>())
  /** Sections whose next change is an id assignment, not an edit. */
  const assigning = React.useRef(new Set<string>())

  const kindOf = React.useCallback((id: string) => kindOfRef.current.get(id), [])

  React.useEffect(() => {
    kindOfRef.current = new Map([...(mentionEntries ?? []), ...entries].map((entry) => [entry.id, entry.kind]))
  }, [entries, mentionEntries])

  React.useEffect(() => {
    for (const conversion of documentToEntries(initialContent)) lastSeen.current.set(conversion.blockId, fingerprint(conversion))
  }, [initialContent])

  // The mention index: stored Entries, with names updated live from the editor.
  const entryIndex = React.useMemo(() => {
    const index = new Map(buildEntryIndex([...(mentionEntries ?? []), ...entries]))
    for (const conversion of live) {
      const existing = conversion.entryId ? index.get(conversion.entryId) : undefined
      if (existing && conversion.content) {
        index.set(conversion.entryId, { ...existing, name: conversion.content.name, description: conversion.content.description } satisfies EntrySummary)
      }
    }
    return index
  }, [entries, mentionEntries, live])

  const kindCounts = React.useMemo(() => {
    const counts: Partial<Record<EntryKind, number>> = {}
    for (const conversion of live) counts[conversion.kind] = (counts[conversion.kind] ?? 0) + 1
    return counts
  }, [live])

  const annotations = React.useMemo(
    () =>
      indexAnnotations(
        live.flatMap((conversion) => [
          ...conversion.issues.map((issue) => ({ blockId: issue.fieldBlockId ?? issue.blockId, severity: "error" as const, message: issue.message })),
          ...conversion.warnings.map((warning) => ({ blockId: warning.fieldBlockId, severity: "warning" as const, message: warning.message })),
        ])
      ),
    [live]
  )

  // Heading metadata follows the `entries` prop (optimistic status changes, fresh Jev flags).
  React.useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    editor.transact((tr) => {
      tr.setMeta(ALLOW_LOCKED_META, true)
      for (const entry of entries) {
        const heading = headingForEntry(editor, entry.id)
        if (!heading) continue
        const next = { status: entry.status, source: entry.source, sourceTurn: entry.sourceTurn ?? -1, jevFlags: JSON.stringify(entry.jevFlags) }
        const props = heading.props
        if (props.status !== next.status || props.source !== next.source || props.sourceTurn !== next.sourceTurn || props.jevFlags !== next.jevFlags) {
          editor.updateBlock(heading, { props: next as never })
        }
      }
    })
  }, [entries])

  React.useImperativeHandle(
    ref,
    () => ({
      editor: () => editorRef.current,
      focusEntry: (entryId) => {
        const editor = editorRef.current
        const heading = editor && headingForEntry(editor, entryId)
        if (!editor || !heading) return
        focusBlock(editor, heading.id, "end")
        flashBlock(editor, heading.id)
      },
      revealEntry: (entryId) => {
        const editor = editorRef.current
        const heading = editor && headingForEntry(editor, entryId)
        if (!editor || !heading) return
        editor.domElement
          ?.querySelector(`.bn-block[data-id="${CSS.escape(heading.id)}"]`)
          ?.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })
        flashBlock(editor, heading.id)
      },
      assignEntryId: (blockId, entryId) => {
        const editor = editorRef.current
        const heading = editor?.getBlock(blockId)
        if (!editor || !heading) return
        assigning.current.add(blockId)
        editor.updateBlock(heading, { props: { entryId } as never })
      },
      focusedEntry: () => {
        const editor = editorRef.current
        if (!editor) return null
        const heading = sectionOf(editor, editor.getTextCursorPosition().block.id)?.heading
        return heading && isEntryBlockType(heading.type) ? entryBlockInfo(heading as EntryBlock) : null
      },
    }),
    []
  )

  return (
    <SandsEditorView
      surface="entry"
      label="Codex Entries"
      initialContent={initialContent}
      readOnly={readOnly}
      className={className}
      context={{ entryIndex, entryActions, entryLabelNote, kindCounts, annotations }}
      onReady={(editor) => {
        editorRef.current = editor
      }}
      onChange={(document) => {
        const conversions = documentToEntries(document, { kindOf })
        setLive(conversions)
        for (const conversion of conversions) {
          const print = fingerprint(conversion)
          if (lastSeen.current.get(conversion.blockId) === print) continue
          lastSeen.current.set(conversion.blockId, print)
          if (assigning.current.delete(conversion.blockId) || conversion.status === "locked") continue
          onEntryChange?.(conversion)
        }
      }}
    />
  )
}
