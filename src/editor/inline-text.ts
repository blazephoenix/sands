/**
 * Reading plain text and mentions out of the shared editor's inline content.
 * Pure.
 */
import type { SandsInline } from "./schema-config"

type InlineLike = SandsInline | { type: string; [key: string]: unknown }

/**
 * Plain text of inline content. Hard breaks arrive as "\n". Mentions render as
 * their Entry's current name when `nameOf` knows it, else as the label saved
 * with the mention.
 */
export function inlineToText(
  content: readonly InlineLike[] | undefined,
  nameOf?: (entryId: string) => string | undefined
): string {
  if (!content) return ""
  let out = ""
  for (const node of content) {
    if (node.type === "text") {
      out += (node as { text: string }).text
    } else if (node.type === "link") {
      out += inlineToText((node as { content: InlineLike[] }).content, nameOf)
    } else if (node.type === "entryMention") {
      const props = (node as { props: { entryId: string; label: string } })
        .props
      out += `@${nameOf?.(props.entryId) ?? props.label}`
    }
  }
  return out
}

/** Entry ids mentioned in inline content, in order, without duplicates. */
export function mentionedEntryIds(
  content: readonly InlineLike[] | undefined
): string[] {
  const ids: string[] = []
  const visit = (nodes: readonly InlineLike[] | undefined) => {
    for (const node of nodes ?? []) {
      if (node.type === "entryMention") {
        const id = (node as { props: { entryId: string } }).props.entryId
        if (id && !ids.includes(id)) ids.push(id)
      } else if (node.type === "link") {
        visit((node as { content: InlineLike[] }).content)
      }
    }
  }
  visit(content)
  return ids
}

/**
 * Normalises a field's text: trims trailing spaces on each line, drops blank
 * lines at the start and end, and collapses runs of blank lines to one.
 */
export function normaliseFieldText(text: string): string {
  return text
    .split("\n")
    .map((line) => line.replace(/\s+$/u, ""))
    .join("\n")
    .replace(/\n{3,}/gu, "\n\n")
    .replace(/^\n+|\n+$/gu, "")
    .trim()
}

/** Paragraphs of a field's text, for display. */
export function paragraphsOf(text: string): string[] {
  return text
    .split(/\n+/u)
    .map((line) => line.trim())
    .filter(Boolean)
}

/**
 * Words an Author types to mean "nothing here": "None", "N/A", "nil", a dash.
 * In a list field such an item is not an item; kept, "None" as an alias
 * would make every "none" in a Passage name the character.
 */
export function isPlaceholderItem(item: string): boolean {
  const word = item.trim().toLowerCase().replace(/[.\s]/gu, "")
  return /^(none|nil|null|na|n\/a|nothing|-+|—|–)$/u.test(word)
}

export function splitList(text: string, mode: "lines" | "comma"): string[] {
  return text
    .split(mode === "lines" ? /\n+/u : /[,\n]/u)
    .map((item) => item.trim())
    .filter((item) => item && !isPlaceholderItem(item))
}
