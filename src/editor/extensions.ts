/**
 * Editor extensions for the plain-document design (docs/design/editor-design.md):
 *
 * - `sectionsExtension`: decorations that mark each field paragraph with its
 *   section's state (for CSS: rejected, locked), show a muted hint after an
 *   empty known `Label:`, and show validation notes at the end of the
 *   paragraph they concern. No controls are added to any block.
 * - Keyboard: `Mod-Shift-h` toggles the Hidden style; `Mod-/` opens the block
 *   menu (the keyboard route to the ⠿ menu's actions); `Shift-Mod-ArrowUp/Down`
 *   move a whole section.
 * - `installLockGuard`: refuses edits inside locked Entries and to the group
 *   dividers.
 */
import { createExtension, type ExtensionOptions } from "@blocknote/core"
import {
  Plugin,
  PluginKey,
  type EditorState,
  type Transaction,
} from "@tiptap/pm/state"
import { Decoration, DecorationSet } from "@tiptap/pm/view"
import type { Node as PMNode } from "@tiptap/pm/model"

import { BRIEF_BLOCKS, isBriefBlockType } from "@/brief/fields"

import {
  ALLOW_LOCKED_META,
  moveUnit,
  sectionOf,
  type SandsEditor,
} from "./commands"
import type { BlockAnnotation } from "./editor-context"
import { ENTRY_FIELDS } from "./entry-fields"
import { matchLabel, splitLabel } from "./field-line"
import {
  ENTRY_KIND_OF_BLOCK,
  isEntryBlockType,
  isSectionHeadingType,
} from "./schema-config"
import { EDITOR_SHORTCUTS } from "./shortcuts"

type SpecLike = {
  key: string
  label: string
  aliases?: readonly string[]
  placeholder: string
}

function specsFor(headingType: string): readonly SpecLike[] {
  if (isBriefBlockType(headingType)) return BRIEF_BLOCKS[headingType].fields
  if (isEntryBlockType(headingType))
    return ENTRY_FIELDS[ENTRY_KIND_OF_BLOCK[headingType]]
  return []
}

/** `Label: value` read straight from a ProseMirror paragraph. */
function readPMField(
  content: PMNode
): { label: string; empty: boolean; labelEnd: number } | null {
  if (content.type.name !== "paragraph") return null
  let leading = ""
  for (let index = 0; index < content.childCount; index++) {
    const child = content.child(index)
    if (!child.isText) return null
    const text = child.text ?? ""
    if (!text.includes(":")) {
      leading += text
      continue
    }
    const split = splitLabel(leading + text)
    if (!split) return null
    const after = (leading + text).slice(split.valueStart)
    let empty = after.trim() === ""
    for (let rest = index + 1; rest < content.childCount && empty; rest++) {
      const node = content.child(rest)
      empty = node.isText ? !(node.text ?? "").trim() : false
    }
    // Offset just past the colon: every child before this one is text.
    return { label: split.label, empty, labelEnd: split.valueStart }
  }
  return null
}

function isBlankContainer(container: PMNode) {
  const content = container.firstChild
  return (
    container.childCount === 1 &&
    !!content &&
    content.isTextblock &&
    content.textContent.trim() === "" &&
    content.childCount === 0
  )
}

type ScannedField = {
  pos: number
  container: PMNode
  content: PMNode
  label: string
  empty: boolean
  labelEnd: number
}
type ScannedSection = {
  pos: number
  container: PMNode
  heading: PMNode
  fields: ScannedField[]
}

/** Sections in a ProseMirror doc, by the same rules as `walkSections`. */
function scanSections(doc: PMNode): ScannedSection[] {
  const sections: ScannedSection[] = []
  let current: ScannedSection | null = null
  doc.descendants((node, pos) => {
    if (node.type.name !== "blockContainer") return true
    const content = node.firstChild
    if (!content) return true
    if (isSectionHeadingType(content.type.name)) {
      current = { pos, container: node, heading: content, fields: [] }
      sections.push(current)
      return true
    }
    if (isBlankContainer(node)) return true
    const field = current ? readPMField(content) : null
    if (current && field)
      current.fields.push({ pos, container: node, content, ...field })
    else current = null
    return true
  })
  return sections
}

type Options = {
  /** Validation notes by block id, from the page's conversion. */
  annotations: () => ReadonlyMap<string, BlockAnnotation[]>
  /** Opens the keyboard block menu for the block holding the cursor. */
  openBlockMenu: () => void
}

const sectionsKey = new PluginKey<DecorationSet>("sandsSections")

/** Tells the sections plugin to recompute (e.g. after new annotations). */
export function refreshSections(editor: SandsEditor) {
  editor.transact((tr) => {
    tr.setMeta(sectionsKey, "refresh")
  })
}

function noteWidget(annotations: BlockAnnotation[]) {
  return () => {
    const span = document.createElement("span")
    span.className = "sands-field-note"
    span.dataset.severity = annotations.some((a) => a.severity === "error")
      ? "error"
      : "warning"
    span.contentEditable = "false"
    span.textContent = annotations.map((a) => a.message).join(" ")
    return span
  }
}

function hintWidget(text: string) {
  return () => {
    const span = document.createElement("span")
    span.className = "sands-field-hint"
    span.contentEditable = "false"
    span.setAttribute("aria-hidden", "true")
    span.textContent = text
    return span
  }
}

function buildDecorations(
  state: EditorState,
  annotations: ReadonlyMap<string, BlockAnnotation[]>
) {
  const decorations: Decoration[] = []
  for (const section of scanSections(state.doc)) {
    const status = section.heading.attrs.status as string | undefined
    const specs = specsFor(section.heading.type.name)
    for (const field of section.fields) {
      const id = field.container.attrs.id as string
      const notes = annotations.get(id) ?? []
      const attrs: Record<string, string> = { "data-sands-field": "" }
      if (status && isEntryBlockType(section.heading.type.name))
        attrs["data-sands-status"] = status
      if (notes.length > 0)
        attrs["data-sands-note"] = notes.some((n) => n.severity === "error")
          ? "error"
          : "warning"
      decorations.push(
        Decoration.node(field.pos, field.pos + field.container.nodeSize, attrs)
      )

      const contentEnd = field.pos + 2 + field.content.content.size
      if (field.empty) {
        const match = matchLabel(field.label, specs)
        if (match.kind === "known" && notes.length === 0) {
          decorations.push(
            Decoration.widget(contentEnd, hintWidget(match.spec.placeholder), {
              side: 1,
              ignoreSelection: true,
              key: `hint-${id}`,
            })
          )
        }
      }
      if (notes.length > 0) {
        decorations.push(
          Decoration.widget(contentEnd, noteWidget(notes), {
            side: 2,
            ignoreSelection: true,
            key: `note-${id}-${notes.map((n) => n.message).join("|")}`,
          })
        )
      }
    }
  }
  return DecorationSet.create(state.doc, decorations)
}

export const sectionsExtension = createExtension(
  ({ editor: anyEditor, options }: ExtensionOptions<Options>) => {
    const editor = anyEditor as unknown as SandsEditor
    return {
      key: "sandsSections",
      prosemirrorPlugins: [
        new Plugin<DecorationSet>({
          key: sectionsKey,
          state: {
            init: (_config, state) =>
              buildDecorations(state, options.annotations()),
            apply: (tr: Transaction, previous, _old, state) =>
              tr.docChanged || tr.getMeta(sectionsKey)
                ? buildDecorations(state, options.annotations())
                : previous.map(tr.mapping, tr.doc),
          },
          props: {
            decorations: (state) => sectionsKey.getState(state),
          },
          appendTransaction: (transactions, _old, state) =>
            boldLabels(transactions, state),
        }),
      ],
      keyboardShortcuts: {
        [EDITOR_SHORTCUTS.toggleHidden]: () => {
          if (!editor.isEditable) return true
          editor.toggleStyles({ hidden: true })
          return true
        },
        [EDITOR_SHORTCUTS.blockMenu]: () => {
          options.openBlockMenu()
          return true
        },
        [EDITOR_SHORTCUTS.moveUp]: () => moveCurrent(editor, -1),
        [EDITOR_SHORTCUTS.moveDown]: () => moveCurrent(editor, 1),
      },
    } as const
  }
)

/**
 * Keeps every field's `Label:` bold, including labels the Author types by hand,
 * and keeps the cursor's next characters plain when it sits right after one.
 */
function boldLabels(
  transactions: readonly Transaction[],
  state: EditorState
): Transaction | null {
  if (!transactions.some((tr) => tr.docChanged)) return null
  const bold = state.schema.marks.bold
  if (!bold) return null
  let tr: Transaction | null = null
  for (const section of scanSections(state.doc)) {
    for (const field of section.fields) {
      const from = field.pos + 2
      const to = from + field.labelEnd
      let allBold = true
      state.doc.nodesBetween(from, to, (node) => {
        if (node.isText && !bold.isInSet(node.marks)) allBold = false
        return allBold
      })
      if (allBold) continue
      tr ??= state.tr
      tr.addMark(from, to, bold.create())
      const { selection } = state
      if (selection.empty && selection.from === to)
        tr.setStoredMarks(
          selection.$from.marks().filter((mark) => mark.type !== bold)
        )
    }
  }
  return tr
}

/** Moves the unit holding the cursor, unless the cursor is on a field line (which moves on its own). */
function moveCurrent(editor: SandsEditor, direction: -1 | 1) {
  if (!editor.isEditable) return true
  const { block } = editor.getTextCursorPosition()
  const section = sectionOf(editor, block.id)
  const onField = section && section.heading?.id !== block.id
  if (onField) return false
  return moveUnit(editor, block.id, direction)
}

/**
 * Refuses any transaction that changes a locked Entry (heading or fields) or a
 * group divider, unless it carries `ALLOW_LOCKED_META`.
 */
export function installLockGuard(editor: SandsEditor) {
  return editor.onBeforeChange(({ tr }) => {
    if (!tr.docChanged || tr.getMeta(ALLOW_LOCKED_META)) return true
    const guarded = protectedIds(tr.before)
    if (guarded.size === 0) return true
    let blocked = false
    tr.steps.forEach((step, index) => {
      if (blocked) return
      const doc = tr.docs[index]
      step.getMap().forEach((from, to) => {
        if (blocked) return
        doc.nodesBetween(from, Math.min(to, doc.content.size), (node) => {
          if (blocked) return false
          // A range that only touches a container's edge (inserting next to it) is not visited.
          if (
            node.type.name === "blockContainer" &&
            guarded.has(node.attrs.id as string)
          )
            blocked = true
          return !blocked
        })
      })
      const json = step.toJSON() as { stepType?: string; pos?: number }
      if (
        !blocked &&
        json.stepType === "attr" &&
        typeof json.pos === "number"
      ) {
        const $pos = doc.resolve(json.pos)
        for (let depth = $pos.depth; depth >= 0 && !blocked; depth--) {
          const ancestor = $pos.node(depth)
          if (
            ancestor.type.name === "blockContainer" &&
            guarded.has(ancestor.attrs.id as string)
          )
            blocked = true
        }
        const node = doc.nodeAt(json.pos)
        if (
          node?.type.name === "blockContainer" &&
          guarded.has(node.attrs.id as string)
        )
          blocked = true
      }
    })
    return !blocked
  })
}

/** Block ids that must not change: locked Entries' headings and fields, and group dividers. */
export function protectedIds(doc: PMNode): Set<string> {
  const ids = new Set<string>()
  for (const section of scanSections(doc)) {
    if (
      section.heading.attrs.status === "locked" &&
      isEntryBlockType(section.heading.type.name)
    ) {
      ids.add(section.container.attrs.id as string)
      for (const field of section.fields)
        ids.add(field.container.attrs.id as string)
    }
  }
  doc.descendants((node) => {
    if (
      node.type.name === "blockContainer" &&
      node.firstChild?.type.name === "entryGroup"
    )
      ids.add(node.attrs.id as string)
    return true
  })
  return ids
}
