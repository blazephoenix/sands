/**
 * The Player state before the Opening (spec §6 `state_json`, §9.0): at the
 * start Location, in the first Arc, with the starting Reputation and nothing
 * found. Pure.
 */
import { isLiveEntry, type Entry } from "@/domain/entry"
import type { PlayerState } from "@/domain/session"

import { ENGINE_CONFIG } from "./config"

/**
 * The state a Session starts in, from its Codex. The start Location is the
 * live Location marked `isStart`, else the first live Location. Null when the
 * Codex has no live Location to start in.
 */
export function initialState(entries: readonly Entry[]): PlayerState | null {
  const locations = entries.filter(
    (entry) => entry.kind === "location" && isLiveEntry(entry)
  )
  const start =
    locations.find(
      (entry) => entry.kind === "location" && entry.data.isStart
    ) ?? locations[0]
  if (!start) return null
  return {
    locationId: start.id,
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
