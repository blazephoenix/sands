"use client"

/**
 * What the custom blocks and menus need from the page around the editor. Block
 * node views render inside the BlockNoteView's React tree, so they read this
 * context like any other component.
 */
import * as React from "react"

import type { Entry, EntryKind, EntrySource, EntryStatus, JevFlag } from "@/domain/entry"

export type EditorSurface = "brief" | "entry"

/** What a mention or the mention menu needs to know about an Entry. */
export type EntrySummary = {
  id: string
  kind: EntryKind
  name: string
  status: EntryStatus
  source: EntrySource
  description: string
}

export type EntryIndex = ReadonlyMap<string, EntrySummary>

export function buildEntryIndex(entries: readonly Pick<Entry, keyof EntrySummary>[]): EntryIndex {
  return new Map(
    entries.map((entry) => [
      entry.id,
      { id: entry.id, kind: entry.kind, name: entry.name, status: entry.status, source: entry.source, description: entry.description },
    ])
  )
}

/** What an Entry heading shows and hands to the page's menu actions. */
export type EntryBlockInfo = {
  /** Heading block id (the Entry id for stored Entries). */
  blockId: string
  /** Empty for an Entry the Author has just added and the server has not stored yet. */
  entryId: string
  kind: EntryKind
  name: string
  source: EntrySource
  status: EntryStatus
  sourceTurn: number | null
  jevFlags: JevFlag[]
}

/** One item of a block's actions menu (the ⠿ menu, and the keyboard block menu). */
export type BlockAction = {
  id: string
  label: string
  /** For toggles: shows a check. */
  checked?: boolean
  disabled?: boolean
  destructive?: boolean
  /** A shortcut to show next to it, ProseMirror style ("Mod-Shift-ArrowUp", "a"). */
  shortcut?: string
  run: () => void
}

/** A validation note shown on a block: an error (blocks setup) or a warning. */
export type BlockAnnotation = { severity: "error" | "warning"; message: string }

export type SandsEditorContextValue = {
  surface: EditorSurface
  /** The whole editor is read-only (e.g. the Brief while setup runs). */
  readOnly: boolean
  /** Entries a mention can resolve to (rejected ones included, so broken mentions can say what they were). */
  entryIndex: EntryIndex
  /** Page actions for an Entry heading's menu: Accept, Reject, Restore. */
  entryActions?: (entry: EntryBlockInfo) => BlockAction[]
  /** A short plain-text note for an Entry's label line, e.g. "new, Turn 5". */
  entryLabelNote?: (entry: EntryBlockInfo) => string | null
  /** Errors and warnings by block id (headings render theirs; paragraphs get decorations). */
  annotations: ReadonlyMap<string, BlockAnnotation[]>
  /** Live number of Entries per kind, for the group dividers. */
  kindCounts: Readonly<Partial<Record<EntryKind, number>>>
}

const EMPTY_MAP = new Map<string, never>()

export const SandsEditorContext = React.createContext<SandsEditorContextValue>({
  surface: "brief",
  readOnly: false,
  entryIndex: EMPTY_MAP,
  annotations: EMPTY_MAP,
  kindCounts: {},
})

export function useSandsEditorContext() {
  return React.useContext(SandsEditorContext)
}

/** Groups annotations by block id. */
export function indexAnnotations(items: readonly ({ blockId: string | null } & BlockAnnotation)[]) {
  const map = new Map<string, BlockAnnotation[]>()
  for (const { blockId, severity, message } of items) {
    if (!blockId) continue
    map.set(blockId, [...(map.get(blockId) ?? []), { severity, message }])
  }
  return map
}
