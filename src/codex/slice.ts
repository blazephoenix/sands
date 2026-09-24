/**
 * The Codex slice (spec §9.3; CONTEXT.md): the part of a Session's Codex the
 * Writer and the Judge see for one Turn, narrowed to the scene. Pure.
 *
 * Name matching is code, not the Judge (spec §10.3 Character drift). Drafts
 * call characters by a given name or a surname ("Nell", "Pryce"), so a
 * character matches by full name, alias, or any capitalised word of their
 * name; a place or thing matches by its full name only. Removed Entries never
 * match and never reach the Writer; the Judge gets only their names, to catch
 * a Draft that brings one back.
 */
import { isLiveEntry, type Entry, type EntryOfKind } from "@/domain/entry"
import type { PlayerState } from "@/domain/session"

const LETTER_OR_DIGIT = "[\\p{L}\\p{N}]"

function escape(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** A pattern for `phrase` as whole words; case-insensitive unless asked. */
function wholeWords(phrase: string, caseSensitive: boolean) {
  const words = phrase.trim().split(/\s+/u).map(escape).join("\\s+")
  return new RegExp(
    `(?<!${LETTER_OR_DIGIT})${words}(?!${LETTER_OR_DIGIT})`,
    caseSensitive ? "u" : "iu"
  )
}

/**
 * The given names and surnames of a character's name: capitalised words of
 * three letters or more that are not abbreviations ("Dr.", "St").
 */
function nameParts(name: string) {
  return name
    .split(/\s+/u)
    .map((word) => word.replace(/^[^\p{L}]+|[^\p{L}.]+$/gu, ""))
    .filter(
      (word) => word.length >= 3 && !word.endsWith(".") && /^\p{Lu}/u.test(word)
    )
}

function isPerson(entry: Entry): entry is EntryOfKind<"character" | "npc"> {
  return entry.kind === "character" || entry.kind === "npc"
}

/** Every pattern that names this Entry in prose. */
function patternsFor(entry: Entry): RegExp[] {
  const patterns: RegExp[] = []
  if (entry.name.trim()) patterns.push(wholeWords(entry.name, false))
  if (isPerson(entry)) {
    for (const alias of entry.data.aliases)
      if (alias.trim()) patterns.push(wholeWords(alias, false))
    for (const part of nameParts(entry.name))
      patterns.push(wholeWords(part, true))
  }
  return patterns
}

/** The live Entries that `text` names, in Codex order. */
export function namedEntries(text: string, entries: readonly Entry[]): Entry[] {
  if (!text.trim()) return []
  return entries.filter(
    (entry) =>
      isLiveEntry(entry) &&
      patternsFor(entry).some((pattern) => pattern.test(text))
  )
}

export type CodexSliceInput = {
  entries: readonly Entry[]
  /** The Player state the scene is written in (after the Outcome). */
  state: PlayerState
  /** Texts whose named characters join the slice: the Player input and the last Passage. */
  texts: readonly string[]
  /** The Entry the Player acted on, if any. */
  targetId: string | null
  allowedReveals: readonly EntryOfKind<"knowledge">[]
  discoverableClues: readonly EntryOfKind<"clue">[]
}

export type CodexSlice = {
  /** Live Entries only, in Codex order. The Judge sees the same Entries. */
  writer: Entry[]
  /** Names of removed Entries, for the Judge only. */
  rejectedNames: string[]
}

export function codexSlice(input: CodexSliceInput): CodexSlice {
  const live = input.entries.filter(isLiveEntry)
  const byId = new Map(live.map((entry) => [entry.id, entry]))
  const picked = new Set<string>()

  // The current Location and every live Location connected to it, either way.
  const here = input.state.locationId
  picked.add(here)
  for (const entry of live) {
    if (entry.kind !== "location") continue
    if (entry.id === here)
      entry.data.connections.forEach((id) => picked.add(id))
    else if (entry.data.connections.includes(here)) picked.add(entry.id)
  }

  for (const entry of live)
    if (isPerson(entry) && entry.data.isPlayer) picked.add(entry.id)

  const people = live.filter(isPerson)
  for (const text of input.texts)
    for (const person of namedEntries(text, people)) picked.add(person.id)
  if (input.targetId) picked.add(input.targetId)

  for (const knowledge of input.allowedReveals) {
    picked.add(knowledge.id)
    picked.add(knowledge.data.characterId)
  }
  for (const clue of input.discoverableClues) picked.add(clue.id)

  return {
    writer: live.filter((entry) => picked.has(entry.id) && byId.has(entry.id)),
    rejectedNames: input.entries
      .filter((entry) => !isLiveEntry(entry) && entry.name.trim())
      .map((entry) => entry.name.trim()),
  }
}
