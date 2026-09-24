/**
 * New World template Entries, as setup makes them: the Author's own from the
 * Brief (source author, locked) and the Drafter's (source setup, proposed).
 * Pure; the id and the time come from the caller.
 */
import type { Entry, EntryContent, EntrySource } from "@/domain/entry"

export type NewEntryContext = {
  worldId: string
  /** Every new Entry of one setup run is stamped with the same time. */
  now: string
  newId: () => string
}

export function newTemplateEntry(
  context: NewEntryContext,
  source: Extract<EntrySource, "author" | "setup">,
  content: EntryContent
): Entry {
  return {
    ...content,
    id: context.newId(),
    worldId: context.worldId,
    sessionId: null,
    templateId: null,
    source,
    sourceTurn: null,
    status: source === "author" ? "locked" : "proposed",
    jevFlags: [],
    seenAt: null,
    createdAt: context.now,
    updatedAt: context.now,
  } as Entry
}
