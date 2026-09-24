/**
 * Setup's parse step (spec §8 step 1): the Brief's characters, Locations and
 * Exit conditions become locked author Entries. Arcs and the Ending stay in
 * the Brief. Pure.
 *
 * - A character keeps its typed fields; its Hidden fields are the typed keys
 *   the Author marked plus the labels of Hidden custom fields, and every
 *   custom field becomes a key fact ("Label: text").
 * - The Brief's first Location is the start location (spec §8 step 2). Brief
 *   Locations have no connections of their own: they are locked, so the
 *   Locations setup drafts list them instead, and connections count both ways.
 * - Each line of an Arc's Exit condition field is one Exit condition.
 */
import type { Brief, KeyFact } from "@/domain/brief"
import { formatKeyFact, type Entry } from "@/domain/entry"

import { newTemplateEntry, type NewEntryContext } from "./new-entries"

function keyFacts(facts: readonly KeyFact[]) {
  return facts.map((fact) => formatKeyFact(fact.label, fact.text))
}

function hiddenFields(item: { hiddenFields: string[]; keyFacts: KeyFact[] }) {
  return [
    ...item.hiddenFields,
    ...item.keyFacts
      .filter((fact) => fact.hidden && !item.hiddenFields.includes(fact.label))
      .map((fact) => fact.label),
  ]
}

export function authorEntries(
  brief: Brief,
  context: NewEntryContext
): Entry[] {
  const characters = brief.characters.map((character) =>
    newTemplateEntry(context, "author", {
      kind: "character",
      name: character.name.trim(),
      description: "",
      keyFacts: keyFacts(character.keyFacts),
      data: {
        role: character.role,
        age: character.age,
        personality: character.personality,
        backstory: character.backstory,
        isPlayer: character.isPlayer,
        hiddenFields: hiddenFields(character),
        aliases: character.aliases,
      },
    })
  )

  const locations = brief.locations.map((location, index) =>
    newTemplateEntry(context, "author", {
      kind: "location",
      name: location.name.trim(),
      description: location.description,
      keyFacts: keyFacts(location.keyFacts),
      data: { connections: [], isStart: index === 0 },
    })
  )

  const exits = brief.arcs.flatMap((arc, arcIndex) =>
    arc.exitConditions
      .map((line) => line.trim())
      .filter((line) => line !== "")
      .map((condition) =>
        newTemplateEntry(context, "author", {
          kind: "exit_condition",
          name: condition,
          description: `From ${arcLabel(arc.name, arcIndex)} in the Brief.`,
          keyFacts: [],
          data: { arcIndex, condition },
        })
      )
  )

  return [...characters, ...locations, ...exits]
}

/** "Arc 3, End," or "Arc 3" for an unnamed Arc. */
function arcLabel(name: string, index: number) {
  return name.trim() ? `Arc ${index + 1}, ${name.trim()},` : `Arc ${index + 1}`
}
