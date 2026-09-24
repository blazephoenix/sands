/**
 * The Player state before the Opening (spec §6 `state_json`, §9.0): at the
 * start Location, in the first Arc, with the starting Reputation and nothing
 * found. Pure.
 */
import { isLiveEntry, type Entry } from "@/domain/entry"
import type { PlayerState } from "@/domain/session"

import { ENGINE_CONFIG } from "./config"

/**
 * The state a Session starts in, from its Codex: at the live Location marked
 * `isStart`. Null when there is none; solvability reports that as the
 * `no_start_location` Gap, so a solvable World always has one.
 */
export function initialState(entries: readonly Entry[]): PlayerState | null {
  const start = entries.find(
    (entry) =>
      entry.kind === "location" && isLiveEntry(entry) && entry.data.isStart
  )
  return start ? startingState(start.id) : null
}

/** The Player state before the Opening, at a given start Location. */
export function startingState(locationId: string): PlayerState {
  return {
    locationId,
    arcIndex: 0,
    cluesFound: [],
    knowledgeRevealed: {},
    reputation: ENGINE_CONFIG.startingReputation,
    offScriptCount: 0,
    warningsGiven: [],
    pacingNudge: { active: false, reason: null },
    ending: "none",
  }
}
