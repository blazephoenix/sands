/**
 * Commands over the shared editor, all in terms of sections: a heading plus its
 * `Label: value` lines. Inserting, deleting and moving a section move the whole
 * section, so its fields never end up under another heading.
 */
import type { BlockNoteEditor } from "@blocknote/core"

import { briefSection, randomId } from "@/brief/to-document"
import type { BriefBlockType } from "@/brief/fields"
import type { EntryKind } from "@/domain/entry"

import { newEntrySection } from "./entry-blocks"
import { isBlankBlock, readFieldLine } from "./field-line"
import {
  isEntryBlockType,
  isSectionHeadingType,
  type SandsBlock,
  type SandsBlockSchema,
  type SandsInlineContentSchema,
  type SandsStyleSchema,
} from "./schema-config"

export type SandsEditor = BlockNoteEditor<
  SandsBlockSchema,
  SandsInlineContentSchema,
  SandsStyleSchema
>

/** Transactions carrying this meta may change locked Entries and group dividers (page-driven syncs). */
export const ALLOW_LOCKED_META = "sands:allowLocked"

export function isSectionHeading(
  block: Pick<SandsBlock, "type"> | undefined
): boolean {
  return !!block && isSectionHeadingType(block.type)
}

export function isLockedEntryHeading(
  block: Pick<SandsBlock, "type" | "props"> | undefined
) {
  return (
    !!block &&
    isEntryBlockType(block.type) &&
    (block.props as { status?: string }).status === "locked"
  )
}

/** A run of top-level blocks that moves as one: a section (heading and fields), or a single block. */
export type Unit = { blocks: SandsBlock[]; heading: SandsBlock | null }

/** Splits the top-level document into sections and single blocks, by the same rules as conversion. */
export function topLevelUnits(document: readonly SandsBlock[]): Unit[] {
  const units: Unit[] = []
  for (let index = 0; index < document.length; index++) {
    const block = document[index]
    if (!isSectionHeading(block)) {
      units.push({ blocks: [block], heading: null })
      continue
    }
    let end = index
    for (let next = index + 1; next < document.length; next++) {
      const candidate = document[next]
      if (isSectionHeading(candidate)) break
      if (readFieldLine(candidate)) end = next
      else if (!isBlankBlock(candidate)) break
    }
    units.push({ blocks: document.slice(index, end + 1), heading: block })
    index = end
  }
  return units
}

/** The top-level block holding `block`. */
export function topLevelOf(
  editor: SandsEditor,
  block: SandsBlock | string
): SandsBlock | undefined {
  let current = typeof block === "string" ? editor.getBlock(block) : block
  for (
    let parent = current && editor.getParentBlock(current);
    parent;
    parent = editor.getParentBlock(parent)
  )
    current = parent
  return current as SandsBlock | undefined
}

/** The unit (section or single block) holding a block. */
export function unitOf(editor: SandsEditor, blockId: string): Unit | undefined {
  const top = topLevelOf(editor, blockId)
  if (!top) return undefined
  return topLevelUnits(editor.document as SandsBlock[]).find((unit) =>
    unit.blocks.some((b) => b.id === top.id)
  )
}

/** The section a block belongs to (its heading, or a field under it), if any. */
export function sectionOf(
  editor: SandsEditor,
  blockId: string
): Unit | undefined {
  const unit = unitOf(editor, blockId)
  return unit?.heading ? unit : undefined
}

function isEmptyParagraph(block: SandsBlock) {
  return block.type === "paragraph" && isBlankBlock(block)
}

/**
 * Inserts blocks as a new unit near the cursor: replacing the cursor's block
 * when it is an empty top-level paragraph, otherwise after the section or
 * block holding the cursor (never between a heading and its fields).
 */
export function insertUnit(
  editor: SandsEditor,
  blocks: SandsBlock[]
): SandsBlock[] {
  const { block: current } = editor.getTextCursorPosition()
  const top = topLevelOf(editor, current as SandsBlock)!
  if (top.id === current.id && isEmptyParagraph(current as SandsBlock)) {
    return editor.replaceBlocks([current], blocks)
      .insertedBlocks as SandsBlock[]
  }
  const unit = unitOf(editor, top.id)
  const anchor = unit?.blocks.at(-1) ?? top
  return editor.insertBlocks(blocks, anchor, "after") as SandsBlock[]
}

/** Puts the cursor where the Author types next in a fresh section: its name, else its first value. */
function focusNewSection(editor: SandsEditor, inserted: SandsBlock[]) {
  const [heading, ...fields] = inserted
  if (Array.isArray(heading.content))
    editor.setTextCursorPosition(heading, "end")
  else if (fields[0]) editor.setTextCursorPosition(fields[0], "end")
}

export function insertBriefSection(editor: SandsEditor, type: BriefBlockType) {
  const inserted = insertUnit(editor, briefSection(type, {}, { ids: randomId }))
  focusNewSection(editor, inserted)
  return inserted
}

export function insertEntrySection(editor: SandsEditor, kind: EntryKind) {
  const inserted = insertUnit(editor, newEntrySection(kind))
  focusNewSection(editor, inserted)
  return inserted
}

export function deleteSection(editor: SandsEditor, headingId: string) {
  const section = sectionOf(editor, headingId)
  if (section) editor.removeBlocks(section.blocks)
}

/** Moves a section (or a single top-level block) past its neighbouring unit. */
export function moveUnit(
  editor: SandsEditor,
  blockId: string,
  direction: -1 | 1
): boolean {
  const units = topLevelUnits(editor.document as SandsBlock[])
  const top = topLevelOf(editor, blockId)
  const index = units.findIndex((unit) =>
    unit.blocks.some((b) => b.id === top?.id)
  )
  const neighbour = units[index + direction]
  if (index === -1 || !neighbour) return false
  const moving = units[index].blocks
  const cursor = editor.getTextCursorPosition().block
  editor.transact(() => {
    editor.removeBlocks(moving)
    if (direction === -1)
      editor.insertBlocks(moving, neighbour.blocks[0], "before")
    else editor.insertBlocks(moving, neighbour.blocks.at(-1)!, "after")
  })
  if (
    editor.getBlock(cursor.id) &&
    Array.isArray(editor.getBlock(cursor.id)!.content)
  ) {
    editor.setTextCursorPosition(cursor.id, "end")
  }
  return true
}

/** Selects a whole section, so a drag of its heading carries its fields along. */
export function selectSection(editor: SandsEditor, headingId: string) {
  const section = sectionOf(editor, headingId)
  if (!section || section.blocks.length < 2) return
  editor.setSelection(section.blocks[0], section.blocks.at(-1)!)
}

export function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
}

function blockElement(editor: SandsEditor, blockId: string) {
  return (
    editor.domElement?.querySelector<HTMLElement>(
      `.bn-block[data-id="${CSS.escape(blockId)}"]`
    ) ?? null
  )
}

/** Places the cursor in a block (or, for a heading without text, its first field) and scrolls it into view. */
export function focusBlock(
  editor: SandsEditor,
  blockId: string,
  where: "start" | "end" = "end"
) {
  const block = editor.getBlock(blockId) as SandsBlock | undefined
  if (!block) return false
  editor.focus()
  if (Array.isArray(block.content)) {
    editor.setTextCursorPosition(block, where)
  } else {
    const next = sectionOf(editor, blockId)?.blocks[1]
    if (next) editor.setTextCursorPosition(next, where)
  }
  blockElement(editor, blockId)?.scrollIntoView({
    block: "center",
    behavior: prefersReducedMotion() ? "auto" : "smooth",
  })
  return true
}

/**
 * Briefly highlights a block (after jumping to it from a validation summary or
 * a solvability gap). CSS `[data-flash]`; under reduced motion it shows without
 * animating.
 */
export function flashBlock(
  editor: SandsEditor,
  blockId: string,
  durationMs = 1600
) {
  const element = blockElement(editor, blockId)
  if (!element) return
  element.removeAttribute("data-flash")
  void element.offsetWidth
  element.setAttribute("data-flash", "")
  window.setTimeout(() => element.removeAttribute("data-flash"), durationMs)
}
