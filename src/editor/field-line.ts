/**
 * `Label: value` fields and sections (editor-design.md). Pure.
 *
 * A section is a heading block followed by the paragraphs that read
 * `Label: value`. Blank paragraphs are skipped. Anything else (another
 * paragraph, a heading, a list, a quote, a divider) is free prose and ends the
 * section; so does the next heading.
 */
import { inlineToText, normaliseFieldText } from "./inline-text"
import type { SandsBlock, SandsInline } from "./schema-config"

/** What may stand before the colon: starts with a letter, at most 40 characters. */
const LABEL = /^\s*([A-Za-z][A-Za-z0-9 '’()&/-]{0,39})\s*$/u

/**
 * Finds the label in a paragraph's leading text: `text` is everything before
 * the first non-text node. Returns the label and where the value starts, or
 * null when the text is not `Label: ...` (including URLs like `https://`).
 */
export function splitLabel(text: string): { label: string; valueStart: number } | null {
  const colon = text.indexOf(":")
  if (colon === -1 || text.startsWith("//", colon + 1)) return null
  const match = LABEL.exec(text.slice(0, colon))
  return match ? { label: match[1].trim(), valueStart: colon + 1 } : null
}

export type FieldLine = {
  /** The label as typed, trimmed. */
  label: string
  /** The inline content after the colon (mentions, styles), leading space removed. */
  value: SandsInline[]
  /** The value as plain text; line breaks from Shift+Enter kept as "\n". */
  text: string
  /** The value carries the Hidden style. */
  hidden: boolean
}

type InlineNode = SandsInline | { type: string; [key: string]: unknown }

/** True when the value carries the Hidden style on any visible text. */
export function hasHiddenStyle(content: readonly InlineNode[] | undefined): boolean {
  for (const node of content ?? []) {
    if (node.type === "text") {
      const text = node as { text: string; styles?: Record<string, unknown> }
      if (text.styles?.hidden && text.text.trim()) return true
    } else if (node.type === "link" && hasHiddenStyle((node as { content: InlineNode[] }).content)) {
      return true
    }
  }
  return false
}

/** Reads a paragraph as `Label: value`, or returns null if it is not one. */
export function readFieldLine(block: SandsBlock): FieldLine | null {
  if (block.type !== "paragraph" || !Array.isArray(block.content)) return null
  const content = block.content as SandsInline[]

  // The label must be plain text before the first colon; a mention or link before it means prose.
  let labelText = ""
  for (let index = 0; index < content.length; index++) {
    const node = content[index]
    if (node.type !== "text") return null
    const colon = node.text.indexOf(":")
    if (colon === -1) {
      labelText += node.text
      continue
    }
    const split = splitLabel(labelText + node.text)
    if (!split) return null
    const rest = node.text.slice(colon + 1)
    const value = trimLeadingSpace([...(rest ? [{ ...node, text: rest }] : []), ...content.slice(index + 1)])
    return {
      label: split.label,
      value,
      text: normaliseFieldText(inlineToText(value)),
      hidden: hasHiddenStyle(value),
    }
  }
  return null
}

/** Drops spaces and tabs at the start of a value, across text nodes. */
function trimLeadingSpace(nodes: SandsInline[]): SandsInline[] {
  const out = [...nodes]
  while (out.length > 0 && out[0].type === "text") {
    const trimmed = out[0].text.replace(/^[ \t]+/u, "")
    if (trimmed) {
      out[0] = { ...out[0], text: trimmed }
      break
    }
    out.shift()
  }
  return out
}

/** Lower-cases and collapses spaces, for case-insensitive label matching. */
export function normaliseLabel(label: string) {
  return label.trim().replace(/\s+/gu, " ").toLowerCase()
}

/** Levenshtein distance. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const current = [i]
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    previous = current
  }
  return previous[b.length]
}

type LabelSpec = { key: string; label: string; aliases?: readonly string[] }

export type LabelMatch<S extends LabelSpec> =
  | { kind: "known"; spec: S }
  | { kind: "typo"; suggestion: S }
  | { kind: "custom" }

/**
 * Matches a label against a section's known labels, case-insensitively. A
 * near miss (edit distance at most 2, and small next to the label's length so
 * that short custom labels like "Aim" are not taken for "Age") is a probable
 * typo; the field still counts as custom.
 */
export function matchLabel<S extends LabelSpec>(label: string, specs: readonly S[]): LabelMatch<S> {
  const wanted = normaliseLabel(label)
  for (const spec of specs) {
    if ([spec.label, ...(spec.aliases ?? [])].some((known) => normaliseLabel(known) === wanted)) return { kind: "known", spec }
  }
  let best: { spec: S; distance: number } | null = null
  for (const spec of specs) {
    for (const known of [spec.label, ...(spec.aliases ?? [])]) {
      const target = normaliseLabel(known)
      const distance = editDistance(wanted, target)
      if (distance <= 2 && distance <= Math.ceil(target.length / 3) && (!best || distance < best.distance)) {
        best = { spec, distance }
      }
    }
  }
  return best ? { kind: "typo", suggestion: best.spec } : { kind: "custom" }
}

/** A block with no text and no mentions. */
export function isBlankBlock(block: SandsBlock) {
  if (block.children.length > 0) return false
  if (!Array.isArray(block.content)) return false
  return inlineToText(block.content as SandsInline[]).trim() === ""
}

export type WalkedField = { block: SandsBlock; line: FieldLine }
export type WalkItem<H extends SandsBlock> =
  | { type: "section"; heading: H; fields: WalkedField[] }
  | { type: "prose"; block: SandsBlock; depth: number }

/**
 * Walks a document in reading order (nested blocks flattened after their
 * parent) and splits it into sections and free prose.
 */
export function walkSections<H extends SandsBlock>(
  document: readonly SandsBlock[],
  isHeading: (block: SandsBlock) => block is H
): WalkItem<H>[] {
  const flat: { block: SandsBlock; depth: number }[] = []
  const flatten = (blocks: readonly SandsBlock[], depth: number) => {
    for (const block of blocks) {
      flat.push({ block, depth })
      flatten(block.children, depth + 1)
    }
  }
  flatten(document, 0)

  const items: WalkItem<H>[] = []
  let current: Extract<WalkItem<H>, { type: "section" }> | null = null
  for (const { block, depth } of flat) {
    if (isHeading(block)) {
      current = { type: "section", heading: block, fields: [] }
      items.push(current)
      continue
    }
    if (isBlankBlock(block)) continue
    const line = current ? readFieldLine(block) : null
    if (current && line) {
      current.fields.push({ block, line })
      continue
    }
    current = null
    items.push({ type: "prose", block, depth })
  }
  return items
}

// Building fields.

type Styles = Record<string, boolean | string>

/**
 * A `Label: value` paragraph: bold `Label:`, then a plain space (so text typed
 * after the label is not bold), then the value in `valueStyles` (e.g.
 * `{ hidden: true }`).
 */
export function fieldParagraph(
  id: string,
  label: string,
  value: string | SandsInline[],
  valueStyles: Styles = {}
): SandsBlock {
  const valueContent: SandsInline[] =
    typeof value === "string"
      ? value
        ? [{ type: "text", text: value, styles: valueStyles }]
        : []
      : value
  return {
    id,
    type: "paragraph",
    props: { backgroundColor: "default", textColor: "default", textAlignment: "left" },
    content: [
      { type: "text", text: `${label}:`, styles: { bold: true } },
      { type: "text", text: " ", styles: {} },
      ...valueContent,
    ],
    children: [],
  } as SandsBlock
}
