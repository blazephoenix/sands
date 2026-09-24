/**
 * Entries as the models read them: plain fields, references as names. Setup's
 * Judge validation reads World Entries this way; play's Writer and Judge read
 * a Session's scene this way, with the Hidden truth marked. Pure.
 */
import { ENTRY_KIND_LABELS, isLiveEntry, type Entry } from "@/domain/entry"
import type { JudgeJson } from "@/models/judge"

/** An Entry as the Judge reads it: its fields, with references as names. */
export function entryForJudge(
  entry: Entry,
  byId: ReadonlyMap<string, Entry>
): { [key: string]: JudgeJson } {
  const name = (id: string | null) => (id ? (byId.get(id)?.name ?? "") : "")
  const names = (ids: readonly string[]) => ids.map(name).filter(Boolean)
  const base: { [key: string]: JudgeJson } = {
    kind: ENTRY_KIND_LABELS[entry.kind].singular,
    name: entry.name,
  }
  if (entry.description.trim()) base.description = entry.description.trim()
  if (entry.keyFacts.length > 0) base.key_facts = entry.keyFacts
  switch (entry.kind) {
    case "location":
      return { ...base, connections: names(entry.data.connections) }
    case "character":
    case "npc":
      return {
        ...base,
        role: entry.data.role,
        age: entry.data.age,
        personality: entry.data.personality,
        backstory: entry.data.backstory,
        aliases: entry.data.aliases,
      }
    case "clue":
      return {
        ...base,
        found_at: name(entry.data.locationId) || null,
        known_by: names(entry.data.knownBy),
        reveals: entry.data.reveals,
        red_herring: entry.data.redHerring,
      }
    case "knowledge":
      return {
        ...base,
        character: name(entry.data.characterId),
        fact: entry.data.fact,
      }
    case "decisive_action":
      return {
        ...base,
        verb: entry.data.verb,
        target: name(entry.data.correctTargetId),
      }
    case "exit_condition":
      return {
        ...base,
        arc: entry.data.arcIndex + 1,
        condition: entry.data.condition,
      }
    default:
      return base
  }
}

type Json = { [key: string]: JudgeJson }

const TYPED_HIDDEN_KEYS = ["role", "age", "personality", "backstory"] as const

/**
 * An Entry as a model reads it, with its Hidden fields marked. References to
 * removed Entries are left out, so a removed name never reaches the Writer.
 */
export function entryForScene(
  entry: Entry,
  byId: ReadonlyMap<string, Entry>,
  marker: string
): Json {
  const live = new Map([...byId].filter(([, e]) => isLiveEntry(e)))
  const shown = entryForJudge(entry, live)
  if (entry.kind !== "character" && entry.kind !== "npc") return shown
  const hidden = new Set(entry.data.hiddenFields)
  for (const key of TYPED_HIDDEN_KEYS) {
    const value = shown[key]
    if (hidden.has(key) && typeof value === "string" && value.trim())
      shown[key] = `${marker} ${value}`
  }
  if (Array.isArray(shown.key_facts)) {
    shown.key_facts = entry.keyFacts.map((fact) => {
      const label = fact.split(":")[0]?.trim() ?? ""
      return hidden.has(label) ? `${marker} ${fact}` : fact
    })
  }
  if (entry.data.isPlayer) shown.player_character = true
  return shown
}
