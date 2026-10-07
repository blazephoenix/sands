/**
 * The Directive builder (spec §9.1 step 4; CONTEXT.md: Directive): what code
 * tells the Writer for one Turn. Pure.
 *
 * Each Allowed reveal is given as the exact fact to convey. Characters may
 * still say new things about themselves, their past and what they want, so
 * long as nothing contradicts the Brief or the Codex. Reveal lines appear only
 * on a Turn with Knowledge or Clues in play. The wording names story
 * mechanics only, never one genre's furniture.
 */
import type { Brief } from "@/domain/brief"
import {
  isLiveEntry,
  playerCharacterOf,
  type Band,
  type Entry,
  type EntryOfKind,
} from "@/domain/entry"
import type { Ending, PlayerState } from "@/domain/session"

import { bandFor, ENGINE_CONFIG } from "./config"
import type { Resolution } from "./resolve"

/** How each Band leans the characters toward the Player character: a lean, not a mandate. */
export const BAND_GUIDANCE: Record<Band, string> = {
  high: "Characters are inclined to trust the Player character, each in their own way.",
  normal:
    "Characters judge the Player character on what they have seen and heard, through their own personality and wants.",
  low: "Characters are wary of the Player character, each in their own way.",
}

export type Directive = {
  kind: "opening" | "turn"
  playerCharacter: string
  location: { name: string; description: string }
  arc: {
    number: number
    name: string
    description: string
    /** The current Arc's live Exit conditions not yet met. */
    exitConditions: string[]
  }
  /** What code decided happened, to narrate. Null for the Opening and for a narrated action. */
  outcome: string | null
  /**
   * For an action that changes nothing code tracks: the Player character's
   * action as typed, the beat to play. Null otherwise.
   */
  beat: string | null
  allowedReveals: { character: string; fact: string }[]
  discoverableClues: { name: string; reveals: string }[]
  band: Band
  bandGuidance: string
  /** An off-script warning to deliver in the story, or null. */
  warning: string | null
  pacingNudge: string | null
  /** The Ending to narrate as the final scene, when this Turn decided one. */
  ending: { kind: Exclude<Ending, "none">; instruction: string } | null
}

export type DirectiveInput = {
  brief: Brief
  entries: readonly Entry[]
  /** The Player state the scene is written in: after the Outcome. */
  state: PlayerState
  /** The resolved Outcome; null for the Opening. */
  resolution: Resolution | null
  /** The Player's input; null for the Opening. */
  playerInput: string | null
  /** Exit conditions the Arc check has found met. */
  metExitConditionIds: readonly string[]
}

function endingInstruction(
  ending: Exclude<Ending, "none">,
  brief: Brief,
  player: string
): string {
  switch (ending) {
    case "win":
      return `The story is won: ${brief.ending.condition.trim() || "the Player character achieves the story's aim"}. Write this as the final scene.`
    case "death":
      return `${player}'s reckless action kills them. Write their death as the final scene.`
    case "removed":
      return `${player} is removed from the story: the people they answer to and deal with will no longer work with them. Write their dismissal as the final scene.`
  }
}

export function buildDirective(input: DirectiveInput): Directive {
  const { brief, entries, state, resolution } = input
  const live = entries.filter(isLiveEntry)
  const byId = new Map(entries.map((entry) => [entry.id, entry]))
  const player = playerCharacterOf(entries)?.name ?? "The Player character"
  const location = byId.get(state.locationId)
  const arc = brief.arcs[state.arcIndex]
  const met = new Set(input.metExitConditionIds)
  // The Band the Turn is played in, as the resolver revealed by it.
  const band = resolution?.band ?? bandFor(state.reputation)
  const ending = state.ending === "none" ? null : state.ending
  const action = resolution?.outcome.action ?? null
  const narrated = action?.kind === "narrated"

  return {
    kind: resolution ? "turn" : "opening",
    playerCharacter: player,
    location: {
      name: location?.name ?? "",
      description: location?.description.trim() ?? "",
    },
    arc: {
      number: state.arcIndex + 1,
      name: arc?.name.trim() ?? "",
      description: arc?.description.trim() ?? "",
      exitConditions: live
        .filter(
          (e): e is EntryOfKind<"exit_condition"> =>
            e.kind === "exit_condition" &&
            e.data.arcIndex === state.arcIndex &&
            !met.has(e.id)
        )
        .map((e) => e.data.condition.trim() || e.name),
    },
    outcome: narrated ? null : (action?.summary ?? null),
    beat: narrated ? (input.playerInput?.trim() ?? "") : null,
    allowedReveals: (resolution?.allowedReveals ?? []).map((k) => ({
      character: byId.get(k.data.characterId)?.name ?? "",
      fact: k.data.fact,
    })),
    discoverableClues: (resolution?.discoverableClues ?? []).map((c) => ({
      name: c.name,
      reveals: c.data.reveals,
    })),
    band,
    bandGuidance: BAND_GUIDANCE[band],
    warning:
      resolution?.warning != null
        ? `Off-script warning (${resolution.warning} of ${ENGINE_CONFIG.offScriptThreshold}): have someone ${player} answers to warn them, in the story, that their conduct puts their place in it at risk.`
        : null,
    pacingNudge: state.pacingNudge.active
      ? `The story has stalled${state.pacingNudge.reason ? ` (${state.pacingNudge.reason})` : ""}. Surface an opportunity that could move the current Arc forward, such as a messenger, a chance meeting or an overheard remark. Do not complete any Exit condition yourself.`
      : null,
    ending: ending
      ? { kind: ending, instruction: endingInstruction(ending, brief, player) }
      : null,
  }
}

/** The Directive as the Writer reads it, and as the harness log records it. */
export function renderDirective(directive: Directive): string {
  const lines: string[] = []
  const player = directive.playerCharacter
  if (directive.kind === "opening") {
    lines.push(
      `Write the opening scene as a cold open: ${player} at ${directive.location.name}, with Arc ${directive.arc.number} (${directive.arc.name}) under way and the world already in motion. Make plain what ${player} is here to do, as the Brief and this Arc give it, and end on something the Player can act on. ${player} does nothing beyond arriving and says nothing; the Player acts next.`
    )
  } else if (directive.beat !== null) {
    lines.push(
      `What ${player} does: ${directive.beat}\nShow it, and how the characters present react.`
    )
  } else {
    lines.push(`What happened (narrate it): ${directive.outcome ?? "—"}`)
  }
  lines.push(`Where: ${directive.location.name}.`)
  lines.push(
    `Arc ${directive.arc.number}: ${directive.arc.name}.${directive.arc.description ? ` ${directive.arc.description}` : ""}`
  )
  if (directive.arc.exitConditions.length > 0)
    lines.push(
      `Still to happen in this Arc, which the Player must bring about (do not complete them yourself): ${directive.arc.exitConditions.join(" / ")}`
    )
  if (directive.allowedReveals.length > 0) {
    lines.push(
      "May be revealed this Turn, each exactly as written and nothing more:"
    )
    for (const reveal of directive.allowedReveals)
      lines.push(`- ${reveal.character}: ${reveal.fact}`)
  }
  if (directive.discoverableClues.length > 0) {
    lines.push("May be found this Turn, exactly as written and nothing more:")
    for (const clue of directive.discoverableClues)
      lines.push(`- ${clue.name}: ${clue.reveals}`)
  }
  lines.push(
    `How characters behave (${directive.band} Band): ${directive.bandGuidance}`
  )
  if (directive.warning) lines.push(directive.warning)
  if (directive.pacingNudge) lines.push(directive.pacingNudge)
  if (directive.ending) lines.push(`Ending: ${directive.ending.instruction}`)
  return lines.join("\n")
}
