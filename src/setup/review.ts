/**
 * The setup review's model (spec §8 step 4, ticket 03): which Entries need the
 * Author's decision, in what order, and what the UI calls each status. Pure.
 *
 * Only what setup drafted needs a decision. The Author's own locked Entries
 * are set aside. The data keeps CONTEXT.md's statuses; the review speaks of
 * Approve / Remove:
 *
 *   proposed -> undecided   accepted, edited -> approved   rejected -> removed
 */
import type { Brief } from "@/domain/brief"
import { ENTRY_KINDS, isLiveEntry, type Entry, type EntryOfKind, type EntryStatus } from "@/domain/entry"

import { clueHandle } from "./solvability"

export type ReviewDecision = "undecided" | "approved" | "removed"

/** The review's word for a status; null for a locked Entry, which needs no decision. */
export function reviewDecision(status: EntryStatus): ReviewDecision | null {
  switch (status) {
    case "proposed":
      return "undecided"
    case "accepted":
    case "edited":
      return "approved"
    case "rejected":
      return "removed"
    case "locked":
      return null
  }
}

export function isFlagged(entry: Pick<Entry, "jevFlags">) {
  return entry.jevFlags.length > 0
}

/**
 * Every Entry that needs a decision, in list order: Judge-flagged first, then
 * World before Story logic and kind by kind (ENTRY_KINDS order), then as stored.
 */
export function reviewQueue(entries: readonly Entry[]): Entry[] {
  return entries
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => entry.status !== "locked")
    .sort(
      (a, b) =>
        Number(isFlagged(b.entry)) - Number(isFlagged(a.entry)) ||
        ENTRY_KINDS.indexOf(a.entry.kind) - ENTRY_KINDS.indexOf(b.entry.kind) ||
        a.index - b.index
    )
    .map(({ entry }) => entry)
}

export type ReviewSections = {
  /** Judge-flagged and undecided. */
  needsALook: Entry[]
  toReview: Entry[]
  approved: Entry[]
  removed: Entry[]
  /** The Author's own Entries from the Brief: set aside, never decisions. */
  locked: Entry[]
}

export function reviewSections(entries: readonly Entry[]): ReviewSections {
  const sections: ReviewSections = { needsALook: [], toReview: [], approved: [], removed: [], locked: [] }
  sections.locked = entries.filter((entry) => entry.status === "locked")
  for (const entry of reviewQueue(entries)) {
    const decision = reviewDecision(entry.status)
    if (decision === "undecided") (isFlagged(entry) ? sections.needsALook : sections.toReview).push(entry)
    else if (decision === "approved") sections.approved.push(entry)
    else if (decision === "removed") sections.removed.push(entry)
  }
  return sections
}

/** The sidebar's rows, top to bottom. */
export function sidebarOrder(sections: ReviewSections): Entry[] {
  return [...sections.needsALook, ...sections.toReview, ...sections.approved, ...sections.removed]
}

export type ReviewProgress = { total: number; reviewed: number; approved: number; removed: number; undecided: number }

export function reviewProgress(entries: readonly Entry[]): ReviewProgress {
  const progress: ReviewProgress = { total: 0, reviewed: 0, approved: 0, removed: 0, undecided: 0 }
  for (const entry of entries) {
    const decision = reviewDecision(entry.status)
    if (!decision) continue
    progress.total++
    progress[decision]++
    if (decision !== "undecided") progress.reviewed++
  }
  return progress
}

/** The Entry to show after deciding `currentId`: the next undecided one in list order, wrapping; null when none is left. */
export function nextUndecided(entries: readonly Entry[], currentId: string | null): string | null {
  const queue = reviewQueue(entries)
  const at = queue.findIndex((entry) => entry.id === currentId)
  const rotated = at === -1 ? queue : [...queue.slice(at + 1), ...queue.slice(0, at)]
  return rotated.find((entry) => entry.id !== currentId && reviewDecision(entry.status) === "undecided")?.id ?? null
}

function list(items: readonly string[]) {
  return items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`
}

/**
 * "Why setup drafted this", in the Author's terms, derived from the Codex and
 * the Brief: the Decisive action a Clue serves, the Clues a Location holds or
 * a character knows, the Arc an Exit condition fills in, the Ending a
 * Decisive action comes from. Rejected Entries count for nothing. Null when
 * nothing applies.
 */
export function whyDrafted(entry: Entry, context: { entries: readonly Entry[]; brief: Brief | null }): string | null {
  const live = context.entries.filter(isLiveEntry)
  const byId = new Map(context.entries.map((e) => [e.id, e]))
  const clues = live.filter((e): e is EntryOfKind<"clue"> => e.kind === "clue")
  const actions = live.filter((e): e is EntryOfKind<"decisive_action"> => e.kind === "decisive_action")
  const knowledge = live.filter((e): e is EntryOfKind<"knowledge"> => e.kind === "knowledge")
  const reasons: string[] = []

  switch (entry.kind) {
    case "clue": {
      for (const action of actions.filter((a) => a.data.requires.includes(entry.id))) {
        const { requires, requiresCount } = action.data
        reasons.push(
          requiresCount !== null && requiresCount < requires.length
            ? `${action.name} needs any ${requiresCount} of ${requires.length} Clues, and this is one.`
            : `${action.name} requires it.`
        )
      }
      if (entry.data.redHerring) reasons.push("A red herring, to mislead the Player.")
      else if (reasons.length === 0 && entry.data.pointsToHidden) reasons.push("It points to the Hidden truth.")
      break
    }
    case "location": {
      if (entry.data.isStart) reasons.push("The start location.")
      const here = clues.filter((clue) => clue.data.locationId === entry.id).map(clueHandle)
      if (here.length > 0) reasons.push(`${list(here)} ${here.length === 1 ? "is" : "are"} found here.`)
      break
    }
    case "character":
    case "npc": {
      const known = clues
        .filter((clue) => clue.data.knownBy.includes(entry.id) || knowledge.some((k) => k.data.characterId === entry.id && k.data.clueId === clue.id))
        .map(clueHandle)
      if (known.length > 0) reasons.push(`Knows ${list(known)}.`)
      for (const action of actions.filter((a) => a.data.correctTargetId === entry.id)) reasons.push(`The target of ${action.name}.`)
      break
    }
    case "knowledge": {
      const clue = entry.data.clueId ? byId.get(entry.data.clueId) : undefined
      const person = byId.get(entry.data.characterId)
      if (clue && isLiveEntry(clue) && person) {
        reasons.push(
          entry.data.minBand === "high"
            ? `Lets ${person.name} reveal ${clueHandle(clue)}, but only at high Band.`
            : `Makes ${clueHandle(clue)} reachable by questioning ${person.name}.`
        )
      }
      break
    }
    case "exit_condition": {
      const arc = context.brief?.arcs[entry.data.arcIndex]
      if (arc) {
        const label = `Arc ${entry.data.arcIndex + 1}, ${arc.name}`
        reasons.push(arc.exitConditions.length === 0 ? `${label}, had no Exit condition in the Brief.` : `Another way to finish ${label}.`)
      }
      break
    }
    case "decisive_action": {
      const ending = context.brief?.ending.condition.trim()
      if (ending) reasons.push(`Derived from the Ending: ${ending}`.replace(/([^.])$/u, "$1."))
      break
    }
    default:
      break
  }
  return reasons.length > 0 ? reasons.join(" ") : null
}
