/**
 * The solvability check (spec §8 step 3): code, pure, no I/O. Setup runs it
 * after the Story logic call, and the setup review re-runs it after every
 * change to a World Entry (spec §7.2).
 *
 * The World is solvable when:
 * - for every live Decisive action, each Clue it lists in Requires exists
 *   (is not rejected), is not a red herring, and is reachable: at a Location
 *   the Player can walk to from the start location, or revealed by a live
 *   character's live Knowledge at normal Band or lower;
 * - every Arc of the Brief has at least one live Exit condition.
 *
 * Rules of interpretation, where spec §8 is silent:
 * - Every listed Clue is checked, even when Clues needed (`requiresCount`) is
 *   fewer than all of them: a listed Clue that is rejected or a red herring is
 *   a broken Decisive action either way, and this errs towards a World that is
 *   certainly solvable.
 * - "Connected to the start location" means reachable through any chain of
 *   connections, followed in both directions whichever Location lists them.
 *   Rejected Entries do not exist: no path passes through a rejected Location,
 *   and rejected Knowledge or characters reveal nothing.
 *
 * Each gap is one sentence the Author can act on, and names the Entry to jump
 * to (the Clue, or the Decisive action when the Clue does not exist) or the Arc.
 */
import { isLiveEntry, type Entry, type EntryOfKind } from "@/domain/entry"
import type { SolvabilityGap, SolvabilityResult } from "@/domain/world"

export type SolvabilityInput = {
  /** The Brief's Arcs, in story order. */
  arcs: readonly { name: string }[]
  entries: readonly Entry[]
}

/** "C1 — Matching knife wounds" -> "C1"; a Clue without a handle goes by its name. */
function clueHandle(clue: Entry) {
  return /^([A-Z]{1,2}\d{1,3})\b/u.exec(clue.name.trim())?.[1] ?? (clue.name.trim() || "An unnamed Clue")
}

function actionName(action: Entry) {
  return action.name.trim() || "A Decisive action"
}

function liveOfKind<K extends Entry["kind"]>(entries: readonly Entry[], kind: K) {
  return entries.filter((entry): entry is EntryOfKind<K> => entry.kind === kind && isLiveEntry(entry))
}

/**
 * Live Locations reachable from the start location(s). A connection counts in
 * both directions, whichever Location lists it; a rejected Location is not
 * there, so no path passes through it.
 */
function reachableLocations(entries: readonly Entry[]) {
  const locations = liveOfKind(entries, "location")
  const live = new Set(locations.map((location) => location.id))
  const neighbours = new Map<string, Set<string>>(locations.map((location) => [location.id, new Set()]))
  for (const location of locations) {
    for (const other of location.data.connections) {
      if (!live.has(other) || other === location.id) continue
      neighbours.get(location.id)!.add(other)
      neighbours.get(other)!.add(location.id)
    }
  }
  const starts = locations.filter((location) => location.data.isStart)
  const reached = new Set(starts.map((start) => start.id))
  const queue = [...reached]
  while (queue.length > 0) {
    for (const next of neighbours.get(queue.shift()!) ?? []) {
      if (reached.has(next)) continue
      reached.add(next)
      queue.push(next)
    }
  }
  return { starts, reached }
}

type Graph = {
  byId: ReadonlyMap<string, Entry>
  knowledge: readonly EntryOfKind<"knowledge">[]
  starts: readonly EntryOfKind<"location">[]
  reached: ReadonlySet<string>
}

function names(entries: readonly Entry[]) {
  const list = entries.map((entry) => entry.name.trim() || "someone unnamed")
  if (list.length === 0) return "someone who no longer exists"
  return list.length <= 1 ? list.join("") : `${list.slice(0, -1).join(", ")} and ${list.at(-1)}`
}

/**
 * Null when the Player can reach the Clue: it lies at a Location reachable
 * from the start, or a live character's live Knowledge reveals it at normal
 * Band or lower. Otherwise the reason, in words the Author can act on.
 */
function whyUnreachable(clue: EntryOfKind<"clue">, handle: string, graph: Graph): { code: SolvabilityGap["code"]; message: string } | null {
  const { byId, knowledge, starts, reached } = graph
  const revealing = knowledge.filter((k) => k.data.clueId === clue.id)
  const liveRevealers = revealing.filter((k) => isLiveEntry(byId.get(k.data.characterId) ?? { status: "rejected" }))
  if (liveRevealers.some((k) => k.data.minBand !== "high")) return null

  const location = clue.data.locationId ? byId.get(clue.data.locationId) : undefined
  if (location && isLiveEntry(location) && reached.has(location.id)) return null

  const parts: string[] = []
  if (location) {
    parts.push(
      !isLiveEntry(location)
        ? `${handle} sits at ${location.name}, which is rejected.`
        : starts.length === 0
          ? `${handle} sits at ${location.name}, but no Location is the start location. Set Start location to yes on one.`
          : `${handle} sits at an unreachable location: no connections lead from ${starts[0].name} to ${location.name}.`
    )
  }

  const people = (ids: readonly string[]) => [...new Set(ids)].flatMap((id) => byId.get(id) ?? [])
  if (liveRevealers.length > 0) {
    parts.push(
      `${handle} is revealed only at high Band, by ${names(people(liveRevealers.map((k) => k.data.characterId)))}. Required Clues must be revealed at normal Band or lower.`
    )
    return { code: "clue_revealed_too_late", message: parts.join(" ") }
  }
  if (revealing.length > 0) {
    const gone = people(revealing.map((k) => k.data.characterId))
    parts.push(`${handle} is revealed only by ${names(gone)}, who ${gone.length > 1 ? "are" : "is"} rejected.`)
  } else if (clue.data.knownBy.length > 0) {
    parts.push(
      `${handle} is known by ${names(people(clue.data.knownBy))}, but no Knowledge reveals it. Add Knowledge that reveals ${handle} at normal Band or lower.`
    )
  } else if (!location) {
    parts.push(`${handle} is neither at a Location nor known by anyone. Set its Found at or Known by.`)
  }
  return { code: "unreachable_clue", message: parts.join(" ") }
}

/** A World's solvability, without the time it was checked. */
export type SolvabilityCheck = Pick<SolvabilityResult, "passed" | "gaps">

export function checkSolvability(input: SolvabilityInput): SolvabilityCheck {
  const byId = new Map(input.entries.map((entry) => [entry.id, entry]))
  const { starts, reached } = reachableLocations(input.entries)
  const knowledge = liveOfKind(input.entries, "knowledge")
  const gaps: SolvabilityGap[] = []
  const gap = (code: SolvabilityGap["code"], message: string, entryId: string | null, arcIndex: number | null = null) =>
    gaps.push({ code, message, entryId, arcIndex })

  for (const action of liveOfKind(input.entries, "decisive_action")) {
    for (const clueId of action.data.requires) {
      const clue = byId.get(clueId)
      if (!clue || clue.kind !== "clue") {
        gap("missing_clue", `${actionName(action)} requires a Clue that does not exist. Remove it from Requires.`, action.id)
        continue
      }
      const handle = clueHandle(clue)
      if (!isLiveEntry(clue)) {
        gap("missing_clue", `${actionName(action)} requires ${handle}, which is rejected. Restore ${handle} or remove it from Requires.`, clue.id)
        continue
      }
      if (clue.data.redHerring) {
        gap(
          "red_herring_required",
          `${actionName(action)} requires ${handle}, which is a red herring. Set its Red herring to no, or remove ${handle} from Requires.`,
          clue.id
        )
        continue
      }
      const unreachable = whyUnreachable(clue, handle, { byId, knowledge, starts, reached })
      if (unreachable) gap(unreachable.code, unreachable.message, clue.id)
    }
  }

  const covered = new Set(liveOfKind(input.entries, "exit_condition").map((exit) => exit.data.arcIndex))
  input.arcs.forEach((arc, index) => {
    if (covered.has(index)) return
    const label = arc.name.trim() ? `Arc ${index + 1}, ${arc.name.trim()},` : `Arc ${index + 1}`
    gap("arc_without_exit_condition", `${label} has no Exit condition. Add an Exit condition Entry with Arc: ${index + 1}.`, null, index)
  })

  return { passed: gaps.length === 0, gaps }
}
