/**
 * The Ending check (spec §9.1 step 3, "removed"): after an action's changes,
 * whether the Session has ended. Pure. A win or a death the action already
 * decided stands; otherwise Reputation at 0 or the off-script threshold
 * removes the Player.
 */
import type { Ending, PlayerState } from "@/domain/session"

import { ENGINE_CONFIG } from "./config"

export type EndingCheck = { ending: Ending; reason: string | null }

export function checkEnding(
  state: Pick<PlayerState, "reputation" | "offScriptCount">,
  decided: EndingCheck
): EndingCheck {
  if (decided.ending !== "none") return decided
  if (state.reputation <= ENGINE_CONFIG.reputationRange[0]) {
    return {
      ending: "removed",
      reason:
        "Removed: Reputation fell to 0, and no one in the story will deal with the Player character any longer.",
    }
  }
  if (state.offScriptCount >= ENGINE_CONFIG.offScriptThreshold) {
    return {
      ending: "removed",
      reason: `Removed: ${state.offScriptCount} off-script actions, and the threshold is ${ENGINE_CONFIG.offScriptThreshold}.`,
    }
  }
  return { ending: "none", reason: null }
}
