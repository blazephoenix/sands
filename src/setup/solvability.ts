/**
 * The solvability check (spec §8 step 3): code, pure, no I/O. Setup runs it
 * after the Story logic call, and the setup review re-runs it after every
 * change to a World Entry (spec §7.2).
 *
 * The World is solvable when:
 * - every live Decisive action has enough usable Clues: all it lists in
 *   Requires, or Clues needed (`requiresCount`, spec §6) of them when set. A
 *   Clue is usable when it exists (is not rejected), is not a red herring, and
 *   is reachable: at a Location the Player can walk to from the start
 *   location, or revealed by a live character's live Knowledge at normal Band
 *   or lower;
 * - every Arc of the Brief has at least one live Exit condition.
 *
 * When a Decisive action falls short, every unusable Clue it lists is a gap,
 * since fixing any of them helps (the Author's choice of the counting rule).
 *
 * Rules of interpretation, where spec §8 is silent:
 * - "Connected to the start location" means reachable through any chain of
 *   connections, followed in both directions whichever Location lists them.
 *   Rejected Entries do not exist: no path passes through a rejected Location,
 *   and rejected Knowledge or characters reveal nothing.
 *
 * Each gap is a sentence or two the Author can act on, and names the Entry to
 * jump to: the Clue, the Decisive action when the Clue does not exist, or for
 * an Arc, a rejected Exit condition of that Arc that restoring would fix.
 */
import { isLiveEntry, type Entry, type EntryOfKind } from "@/domain/entry"
import type { SolvabilityGap, SolvabilityResult } from "@/domain/world"

export type SolvabilityInput = {
  /** The Brief's Arcs, in story order. */
  arcs: readonly { name: string }[]
  entries: readonly Entry[]
}

/** "C1 — Matching knife wounds" -> "C1"; a Clue without a handle goes by its name. */
export function clueHandle(clue: Pick<Entry, "name">) {
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
        ? `${handle} sits at ${location.name}, which was removed.`
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
    parts.push(`${handle} is revealed only by ${names(gone)}, who ${gone.length > 1 ? "were" : "was"} removed.`)
  } else if (clue.data.knownBy.length > 0) {
    parts.push(
      `${handle} is known by ${names(people(clue.data.knownBy))}, but no Knowledge reveals it. Add Knowledge that reveals ${handle} at normal Band or lower.`
    )
  } else if (!location) {
    parts.push(`${handle} is neither at a Location nor known by anyone. Set its Found at or Known by.`)
  }
  return { code: "unreachable_clue", message: parts.join(" ") }
}

type Problem = { code: SolvabilityGap["code"]; message: string; entryId: string }

/** Why one Clue a Decisive action lists cannot count towards it, or null when it can. */
function whyUnusable(action: EntryOfKind<"decisive_action">, clueId: string, graph: Graph): Problem | null {
  const clue = graph.byId.get(clueId)
  if (!clue || clue.kind !== "clue") {
    return { code: "missing_clue", message: `${actionName(action)} requires a Clue that does not exist. Remove it from Requires.`, entryId: action.id }
  }
  const handle = clueHandle(clue)
  if (!isLiveEntry(clue)) {
    return {
      code: "missing_clue",
      message: `${actionName(action)} requires ${handle}, which was removed. Restore ${handle} or remove it from Requires.`,
      entryId: clue.id,
    }
  }
  if (clue.data.redHerring) {
    return {
      code: "red_herring_required",
      message: `${actionName(action)} requires ${handle}, which is a red herring. Set its Red herring to no, or remove ${handle} from Requires.`,
      entryId: clue.id,
    }
  }
  const unreachable = whyUnreachable(clue, handle, graph)
  return unreachable ? { ...unreachable, entryId: clue.id } : null
}

/** A World's solvability, without the time it was checked. */
export type SolvabilityCheck = Pick<SolvabilityResult, "passed" | "gaps">

export function checkSolvability(input: SolvabilityInput): SolvabilityCheck {
  const byId = new Map(input.entries.map((entry) => [entry.id, entry]))
  const { starts, reached } = reachableLocations(input.entries)
  const knowledge = liveOfKind(input.entries, "knowledge")
  const graph: Graph = { byId, knowledge, starts, reached }
  const gaps: SolvabilityGap[] = []
  const gap = (code: SolvabilityGap["code"], message: string, entryId: string | null, arcIndex: number | null = null) =>
    gaps.push({ code, message, entryId, arcIndex })

  for (const action of liveOfKind(input.entries, "decisive_action")) {
    const listed = action.data.requires.length
    const needed = action.data.requiresCount ?? listed
    if (needed > listed) {
      gap(
        "missing_clue",
        `${actionName(action)} needs ${needed} Clues but lists only ${listed}. Add Clues to Requires, or lower Clues needed.`,
        action.id
      )
    }
    const problems = action.data.requires.flatMap((clueId) => {
      const problem = whyUnusable(action, clueId, graph)
      return problem ? [problem] : []
    })
    const usable = listed - problems.length
    if (usable >= needed) continue
    const shortfall =
      needed < listed ? ` ${actionName(action)} needs ${needed} of its ${listed} Clues, and only ${usable} ${usable === 1 ? "is" : "are"} usable.` : ""
    for (const problem of problems) gap(problem.code, problem.message + shortfall, problem.entryId)
  }

  const exits = input.entries.filter((entry): entry is EntryOfKind<"exit_condition"> => entry.kind === "exit_condition")
  input.arcs.forEach((arc, index) => {
    const forArc = exits.filter((exit) => exit.data.arcIndex === index)
    if (forArc.some(isLiveEntry)) return
    const label = arc.name.trim() ? `Arc ${index + 1}, ${arc.name.trim()},` : `Arc ${index + 1}`
    const removed = forArc[0]
    const fix = removed
      ? `Restore ${removed.name.trim() || "its removed Exit condition"}, or add an Exit condition for Arc ${index + 1}.`
      : `Add an Exit condition for Arc ${index + 1}.`
    gap("arc_without_exit_condition", `${label} has no Exit condition. ${fix}`, removed?.id ?? null, index)
  })

  return { passed: gaps.length === 0, gaps }
}
