/**
 * Hidden text inside Skeleton fields: the parts the Author marked as not to
 * be told, stored inline as `<hidden>…</hidden>`. The Writer reads the tags as
 * they are (its instructions say what they mean); the editor turns them into
 * the Hidden style and back.
 */

export const HIDDEN_OPEN = "<hidden>"
export const HIDDEN_CLOSE = "</hidden>"

export type Segment = { text: string; hidden: boolean }

/** Wraps text as Hidden. For fixtures and tests. */
export function hidden(text: string) {
  return `${HIDDEN_OPEN}${text}${HIDDEN_CLOSE}`
}

/**
 * Splits a field into plain and Hidden runs, in order, dropping empty runs.
 * An unclosed `<hidden>` hides the rest of the field; a stray `</hidden>` is
 * dropped.
 */
export function toSegments(value: string): Segment[] {
  const segments: Segment[] = []
  let rest = value
  let inHidden = false
  while (rest.length > 0) {
    const tag = inHidden ? HIDDEN_CLOSE : HIDDEN_OPEN
    const at = rest.indexOf(tag)
    const run = at === -1 ? rest : rest.slice(0, at)
    // Outside Hidden text a close tag is not a tag, so it is dropped.
    const kept = inHidden ? run : run.replaceAll(HIDDEN_CLOSE, "")
    if (kept) segments.push({ text: kept, hidden: inHidden })
    if (at === -1) break
    rest = rest.slice(at + tag.length)
    inHidden = !inHidden
  }
  return segments
}

/**
 * Joins runs back into a field, merging neighbours that share a style. Text
 * that happens to contain a literal tag has its "<" swapped for "‹", so it
 * cannot open or close Hidden text by accident.
 */
export function fromSegments(segments: readonly Segment[]): string {
  let out = ""
  let previous: Segment | null = null
  const merged: Segment[] = []
  for (const segment of segments) {
    if (!segment.text) continue
    if (previous && previous.hidden === segment.hidden) {
      previous.text += segment.text
    } else {
      previous = { ...segment }
      merged.push(previous)
    }
  }
  for (const segment of merged) {
    const safe = segment.text
      .replaceAll(HIDDEN_OPEN, `‹${HIDDEN_OPEN.slice(1)}`)
      .replaceAll(HIDDEN_CLOSE, `‹${HIDDEN_CLOSE.slice(1)}`)
    out += segment.hidden ? hidden(safe) : safe
  }
  return out
}

/** The field's text with the tags removed, Hidden runs included. For comparing names. */
export function plainText(value: string) {
  return toSegments(value)
    .map((segment) => segment.text)
    .join("")
}
