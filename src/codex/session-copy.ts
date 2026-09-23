/**
 * A Session's copy of its World's Entries (ADR-0005). Pure.
 *
 * Every non-rejected World template Entry is copied into a row owned by the
 * Session, pointing back at its template. References between Entries
 * (connections, Clue locations, Knowledge holders, Decisive action targets and
 * requirements) are rewritten to point at the copies. A reference to an Entry
 * that was not copied (a rejected one) is kept as is, so it shows as a broken
 * mention rather than silently disappearing.
 */
import { isLiveEntry, type Entry } from "@/domain/entry"

export type SessionCopyOptions = {
  now: string
  /** Id for the copy of a template Entry. */
  newId: (template: Entry) => string
}

export function copyEntriesForSession(
  worldEntries: readonly Entry[],
  sessionId: string,
  options: SessionCopyOptions
): Entry[] {
  const templates = worldEntries.filter((entry) => entry.sessionId === null && isLiveEntry(entry))
  const idMap = new Map(templates.map((entry) => [entry.id, options.newId(entry)]))
  const remap = (id: string) => idMap.get(id) ?? id
  const remapNullable = (id: string | null) => (id === null ? null : remap(id))

  return templates.map((template): Entry => {
    const base = {
      ...template,
      id: idMap.get(template.id)!,
      sessionId,
      templateId: template.id,
      keyFacts: [...template.keyFacts],
      jevFlags: [...template.jevFlags],
      seenAt: null,
      createdAt: options.now,
      updatedAt: options.now,
    }
    switch (template.kind) {
      case "location":
        return { ...base, kind: "location", data: { ...template.data, connections: template.data.connections.map(remap) } }
      case "clue":
        return {
          ...base,
          kind: "clue",
          data: {
            ...template.data,
            locationId: remapNullable(template.data.locationId),
            knownBy: template.data.knownBy.map(remap),
          },
        }
      case "knowledge":
        return {
          ...base,
          kind: "knowledge",
          data: {
            ...template.data,
            characterId: remap(template.data.characterId),
            clueId: remapNullable(template.data.clueId),
          },
        }
      case "decisive_action":
        return {
          ...base,
          kind: "decisive_action",
          data: {
            ...template.data,
            correctTargetId: remap(template.data.correctTargetId),
            requires: template.data.requires.map(remap),
          },
        }
      case "character":
      case "npc":
        return {
          ...base,
          kind: template.kind,
          data: { ...template.data, hiddenFields: [...template.data.hiddenFields], aliases: [...template.data.aliases] },
        } as Entry
      default:
        return { ...base, data: { ...template.data } } as Entry
    }
  })
}
