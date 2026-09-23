/**
 * The scripted setup run (spec §8), for `POST /api/worlds/[id]/setup`.
 * Ticket 02 builds the route and owns this module; this is its starting data.
 *
 * Real setup takes 30-60 s. The route plays these steps with their durations
 * multiplied by a time scale, so dev can compress them.
 */
import type { SetupStep } from "@/domain/events"
import type { Entry } from "@/domain/entry"
import type { SolvabilityGap } from "@/domain/world"

import { londonEntries } from "./entries"

export type ScriptedSetupStep = {
  step: SetupStep
  /** Duration at real speed. */
  ms: number
  detail: string | null
}

/** One successful run: parse, World call, Story logic call, Judge validation, solvability. */
export const SETUP_SCRIPT: ScriptedSetupStep[] = [
  { step: "parse", ms: 900, detail: "8 Characters, 1 Location, 3 Arcs, 1 Ending" },
  { step: "world_call", ms: 16_000, detail: "4 Locations, 5 NPCs, 2 Exit conditions" },
  { step: "story_logic_call", ms: 18_000, detail: "5 Clues, 4 Knowledge, 1 Decisive action" },
  { step: "validate", ms: 7_000, detail: "2 Entries flagged by the Judge" },
  { step: "solvability", ms: 600, detail: null },
]

/** Default speed-up in dev: about 11 s instead of 43 s. */
export const SETUP_TIME_SCALE = 0.25

export const MAX_STORY_LOGIC_ATTEMPTS = 3

/** Gaps reported on each attempt under the `solvability-failure` scenario. */
export function solvabilityFailureGaps(prefix: string): SolvabilityGap[] {
  return [
    {
      code: "unreachable_clue",
      message: "C4 sits at Tower Bridge, which no Location connects to the start location.",
      entryId: `${prefix}-c4`,
      arcIndex: null,
    },
    {
      code: "clue_revealed_too_late",
      message: "C3 is held only by Nell Garvey, who reveals it at high Band. Required Clues must be revealed at normal Band or lower.",
      entryId: `${prefix}-c3`,
      arcIndex: null,
    },
  ]
}

/** The Entries a successful setup drafts for a World: the London Codex, awaiting review. */
export function draftedEntries(worldId: string, prefix: string): Entry[] {
  return londonEntries(worldId, prefix, "review")
}
