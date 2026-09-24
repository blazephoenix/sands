/**
 * Turns the Drafter's output into proposed setup Entries (spec §8 step 2).
 * Pure.
 *
 * The Drafter refers to things by name, and to Clues by the key it gave
 * them; code resolves every reference to an Entry id. A name matches an
 * Entry's name, or a character's alias, ignoring case, spacing and
 * surrounding quotes. What happens to a name that matches nothing depends on
 * whether a retry can fix it:
 *
 * - **World call:** it is not retried (spec §8 step 3 retries only the Story
 *   logic call), so an unknown connection or an Arc the Brief does not have is
 *   dropped and reported as a note for the server log. A drafted Location or
 *   NPC that repeats a name the World already has is dropped the same way, so
 *   every name resolves to one Entry.
 * - **Story logic call:** an unknown name becomes a Gap (`unknown_name`), fed
 *   back to the retry, and is never stored. A reference in a list is left out
 *   of the list; an Entry that cannot exist without the reference (Knowledge
 *   without its character, a Decisive action without its target) is left out
 *   whole.
 *
 * Clues are stored as "C1 — Title". The Drafter's key is kept when it has the
 * handle shape and is unique; any other Clue gets the next free C number.
 */
import type { Brief } from "@/domain/brief"
import {
  isLiveEntry,
  type Entry,
  type EntryKind,
  type EntryOfKind,
} from "@/domain/entry"
import type { SolvabilityGap } from "@/domain/world"
import { ENGINE_CONFIG } from "@/engine/config"

import type { StoryLogicDraft, WorldDraft } from "./drafter-calls"
import { newTemplateEntry, type NewEntryContext } from "./new-entries"

/** A name as compared: no surrounding quotes, `@` or full stops, single spaces, lower case. */
export function nameKey(name: string) {
  return name
    .normalize("NFKC")
    .replace(/^[\s@"'“‘]+|[\s"'”’.]+$/gu, "")
    .replace(/\s+/gu, " ")
    .toLowerCase()
}

const PEOPLE: readonly EntryKind[] = ["character", "npc"]

/** Finds live Entries by name, then by a character's alias. */
function nameIndex(entries: readonly Entry[]) {
  const byName = new Map<string, Entry[]>()
  const byAlias = new Map<string, Entry[]>()
  const add = (map: Map<string, Entry[]>, name: string, entry: Entry) => {
    const key = nameKey(name)
    if (!key) return
    map.set(key, [...(map.get(key) ?? []), entry])
  }
  for (const entry of entries.filter(isLiveEntry)) {
    add(byName, entry.name, entry)
    if (entry.kind === "character" || entry.kind === "npc")
      for (const alias of entry.data.aliases) add(byAlias, alias, entry)
  }
  return {
    find(name: string, kinds: readonly EntryKind[]): Entry | null {
      const key = nameKey(name)
      const fits = (list?: Entry[]) =>
        list?.find((entry) => kinds.includes(entry.kind))
      return fits(byName.get(key)) ?? fits(byAlias.get(key)) ?? null
    },
    has(name: string) {
      const key = nameKey(name)
      return byName.has(key) || byAlias.has(key)
    },
  }
}

function unique<T>(items: readonly T[]) {
  return [...new Set(items)]
}

/** A draft's number as a whole number. */
function whole(n: number) {
  return Math.round(n)
}

export type ResolvedWorldDraft = {
  entries: Entry[]
  /** What was dropped and why, for the server log. */
  notes: string[]
}

export function resolveWorldDraft(
  draft: WorldDraft,
  input: {
    brief: Brief
    authorEntries: readonly Entry[]
    context: NewEntryContext
  }
): ResolvedWorldDraft {
  const { brief, authorEntries, context } = input
  const notes: string[] = []
  const known = nameIndex(authorEntries)
  const seen = new Set<string>()
  /** A new name: not blank, not already in the World, not drafted twice. */
  const isNew = (name: string, what: string) => {
    const key = nameKey(name)
    if (!key) {
      notes.push(`Dropped a ${what} with no name.`)
      return false
    }
    if (known.has(name) || seen.has(key)) {
      notes.push(`Dropped the ${what} "${name}": the World already has that name.`)
      return false
    }
    seen.add(key)
    return true
  }

  const hasStart = authorEntries.some(
    (e) => e.kind === "location" && isLiveEntry(e) && e.data.isStart
  )
  const drafted = draft.locations
    .filter((location) => isNew(location.name, "Location"))
    .map((location, index) => ({
      location,
      entry: newTemplateEntry(context, "setup", {
        kind: "location",
        name: location.name.trim(),
        description: location.description.trim(),
        keyFacts: [],
        data: { connections: [], isStart: !hasStart && index === 0 },
      }) as EntryOfKind<"location">,
    }))

  const places = nameIndex([
    ...authorEntries.filter((e) => e.kind === "location"),
    ...drafted.map((d) => d.entry),
  ])
  const locations = drafted.map(({ location, entry }) => {
    const connections = location.connections.flatMap((name) => {
      const target = places.find(name, ["location"])
      if (!target) {
        notes.push(
          `Dropped the connection from "${entry.name}" to "${name}": no Location has that name.`
        )
        return []
      }
      return target.id === entry.id ? [] : [target.id]
    })
    return {
      ...entry,
      data: { ...entry.data, connections: unique(connections) },
    }
  })

  const npcs = draft.npcs
    .filter((npc) => isNew(npc.name, "NPC"))
    .map((npc) =>
      newTemplateEntry(context, "setup", {
        kind: "npc",
        name: npc.name.trim(),
        description: npc.description.trim(),
        keyFacts: [],
        data: {
          role: npc.role.trim(),
          age: npc.age.trim(),
          personality: npc.personality.trim(),
          backstory: npc.backstory.trim(),
          isPlayer: false,
          hiddenFields: [],
          aliases: npc.aliases.map((a) => a.trim()).filter(Boolean),
        },
      })
    )

  const exits = draft.exit_conditions.flatMap((exit) => {
    const arcIndex = whole(exit.arc) - 1
    if (!brief.arcs[arcIndex]) {
      notes.push(
        `Dropped the Exit condition "${exit.name}": the Brief has no Arc ${exit.arc}.`
      )
      return []
    }
    return exitConditionEntry(exit, arcIndex, context)
  })

  return { entries: [...locations, ...npcs, ...exits], notes }
}

function exitConditionEntry(
  exit: { name: string; condition: string },
  arcIndex: number,
  context: NewEntryContext
) {
  const condition = exit.condition.trim()
  return newTemplateEntry(context, "setup", {
    kind: "exit_condition",
    name: exit.name.trim() || condition,
    description: "",
    keyFacts: [],
    data: { arcIndex, condition },
  })
}

export type ResolvedStoryLogicDraft = {
  entries: Entry[]
  /** Every reference that matched nothing, as `unknown_name` Gaps for the retry. */
  gaps: SolvabilityGap[]
}

const HANDLE = /^[A-Z]{1,2}\d{1,3}$/u

/** The stored handle for each drafted Clue, in draft order. */
function clueHandles(keys: readonly string[]) {
  const wanted = keys.map((key) => key.trim().toUpperCase())
  const valid = new Set<string>()
  const kept = wanted.map((key) => {
    if (!HANDLE.test(key) || valid.has(key)) return null
    valid.add(key)
    return key
  })
  let next = 1
  return kept.map((key) => {
    if (key) return key
    while (valid.has(`C${next}`)) next++
    valid.add(`C${next}`)
    return `C${next}`
  })
}

export function resolveStoryLogicDraft(
  draft: StoryLogicDraft,
  input: { brief: Brief; codex: readonly Entry[]; context: NewEntryContext }
): ResolvedStoryLogicDraft {
  const { brief, codex, context } = input
  const known = nameIndex(codex)
  const gaps: SolvabilityGap[] = []
  const unknown = (message: string) =>
    gaps.push({ code: "unknown_name", message, entryId: null, arcIndex: null })
  const noPerson = (name: string) =>
    `"${name}", but no character has that name. Use the exact name of a character in the Codex.`

  const handles = clueHandles(draft.clues.map((clue) => clue.key))
  const clues = draft.clues.map((clue, index) => {
    const handle = handles[index]
    let locationId: string | null = null
    if (clue.location !== null && nameKey(clue.location)) {
      locationId = known.find(clue.location, ["location"])?.id ?? null
      if (!locationId)
        unknown(
          `${handle} is found at "${clue.location}", but no Location has that name. Use the exact name of a Location in the Codex, or none.`
        )
    }
    const knownBy = clue.known_by.flatMap((name) => {
      const person = known.find(name, PEOPLE)
      if (!person) unknown(`${handle} is known by ${noPerson(name)}`)
      return person ? [person.id] : []
    })
    const title = clue.title.trim()
    return newTemplateEntry(context, "setup", {
      kind: "clue",
      name: title ? `${handle} — ${title}` : handle,
      description: clue.description.trim(),
      keyFacts: [],
      data: {
        locationId,
        knownBy: unique(knownBy),
        reveals: clue.reveals.trim(),
        pointsToHidden: clue.points_to_hidden_truth,
        redHerring: clue.red_herring,
      },
    })
  })

  /** A Clue by the Drafter's key, its stored handle or its title. */
  const findClue = (ref: string) => {
    const key = nameKey(ref)
    const at = [
      draft.clues.findIndex((clue) => nameKey(clue.key) === key),
      handles.findIndex((handle) => nameKey(handle) === key),
      draft.clues.findIndex((clue) => nameKey(clue.title) === key),
      clues.findIndex((clue) => nameKey(clue.name) === key),
    ].find((index) => index >= 0)
    return at === undefined ? null : clues[at]
  }

  const knowledge = draft.knowledge.flatMap((item) => {
    const name = item.name.trim() || `What ${item.character} knows`
    const person = known.find(item.character, PEOPLE)
    if (!person) {
      unknown(`Knowledge "${name}" belongs to ${noPerson(item.character)}`)
      return []
    }
    let clueId: string | null = null
    if (item.clue !== null && nameKey(item.clue)) {
      clueId = findClue(item.clue)?.id ?? null
      if (!clueId)
        unknown(
          `Knowledge "${name}" reveals "${item.clue}", but no Clue has that key. Use the key of a Clue in the draft, or none.`
        )
    }
    return newTemplateEntry(context, "setup", {
      kind: "knowledge",
      name,
      description: item.description.trim(),
      keyFacts: [],
      data: {
        characterId: person.id,
        fact: item.fact.trim(),
        minBand: item.min_band,
        clueId,
      },
    })
  })

  const actions = draft.decisive_actions.flatMap((action) => {
    const name = action.name.trim() || `${action.verb} ${action.target}`.trim()
    const target = known.find(action.target, PEOPLE)
    if (!target) {
      unknown(`${name} targets ${noPerson(action.target)}`)
      return []
    }
    const requires = action.requires.flatMap((ref) => {
      const clue = findClue(ref)
      if (!clue)
        unknown(
          `${name} requires "${ref}", but no Clue has that key. Use the key of a Clue in the draft.`
        )
      return clue ? [clue.id] : []
    })
    const needed =
      action.clues_needed === null ? null : whole(action.clues_needed)
    return newTemplateEntry(context, "setup", {
      kind: "decisive_action",
      name,
      description: action.description.trim(),
      keyFacts: [],
      data: {
        verb: action.verb.trim(),
        correctTargetId: target.id,
        requires: unique(requires),
        requiresCount: needed !== null && needed >= 1 ? needed : null,
        onSuccess: action.on_success,
        wrongTargetPenalty: Math.abs(ENGINE_CONFIG.wrongTargetPenalty),
        prematurePenalty: Math.abs(ENGINE_CONFIG.prematurePenalty),
      },
    })
  })

  const exits = draft.exit_conditions.flatMap((exit) => {
    const arcIndex = whole(exit.arc) - 1
    if (!brief.arcs[arcIndex]) {
      unknown(
        `Exit condition "${exit.name}" is for Arc ${exit.arc}, but the Brief has ${brief.arcs.length} Arcs. Use the number of an Arc in the Brief.`
      )
      return []
    }
    return exitConditionEntry(exit, arcIndex, context)
  })

  return { entries: [...clues, ...knowledge, ...actions, ...exits], gaps }
}
