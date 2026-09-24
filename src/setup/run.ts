/**
 * Rules of a setup run (spec §8) that do not depend on the models: when a
 * World may run setup, how many Story logic attempts it gets, and how the
 * parse step describes the Brief. Pure. The run itself arrives with the
 * setup engine.
 */
import type { Brief } from "@/domain/brief"
import type { World } from "@/domain/world"

/** The Story logic call runs once, then at most twice more with the gaps as feedback (spec §8 step 3). */
export const MAX_STORY_LOGIC_ATTEMPTS = 3

/**
 * Why setup cannot start for this World, or null when it can: only a `draft`
 * World runs setup.
 */
export function setupConflict(
  world: Pick<World, "setupStatus">
): string | null {
  switch (world.setupStatus) {
    case "draft":
      return null
    case "drafting":
      return "Setup is already running for this World. Wait for it to finish."
    default:
      return "Setup has already run for this World. Open the setup review instead."
  }
}

function plural(count: number, one: string, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`
}

/** The parse step's detail, counted from the Brief itself: "8 Characters, 1 Location, 3 Arcs, 1 Ending". */
export function parseSummary(brief: Brief) {
  const parts = [plural(brief.characters.length, "Character")]
  if (brief.locations.length > 0)
    parts.push(plural(brief.locations.length, "Location"))
  parts.push(plural(brief.arcs.length, "Arc"), "1 Ending")
  return parts.join(", ")
}
