/**
 * The resolver (spec §9.1 step 3): what a Player's action achieves, decided
 * by code from the Judge's Reading (ADR-0001). Pure: the death roll comes in
 * as a number from the Session's seeded generator (`rng.ts`), so a replayed
 * Session reproduces its Outcomes.
 *
 * Order: the intent and the Classification both apply; a Classification
 * never cancels the intent. A reckless action rolls for death first, and a
 * lethal roll ends the Session with nothing else resolved. Otherwise the
 * intent resolves, then the Classification's penalty, then the removed check.
 * An Ending the intent already decided (a win) stands.
 */
import {
  liveOfKinds,
  type Band,
  type Entry,
  type EntryOfKind,
} from "@/domain/entry"
import type { Classification, Outcome, PlayerState } from "@/domain/session"

import { bandFor, clampReputation, ENGINE_CONFIG } from "./config"
import { checkEnding, type EndingCheck } from "./endings"

/** The kind of action the Judge read. A Decisive action carries its verb. */
export type Intent =
  | { kind: "move" | "examine" | "question" | "other" }
  | { kind: "decisive"; verb: string }

/** The Entry acted on, or the Judge's escape options. */
export type Target =
  { kind: "entry"; id: string } | { kind: "none" } | { kind: "not_in_codex" }

export type ResolveInput = {
  /** The Player state before this Turn. */
  state: PlayerState
  /** The Session's Codex, removed Entries included. */
  entries: readonly Entry[]
  intent: Intent
  target: Target
  /** Already floored: below the confidence floor it is `tangential`. */
  classification: Classification
  /** This Turn's seeded roll in [0, 1); used only by a reckless action. */
  deathRoll: number
}

export type Resolution = {
  outcome: Outcome
  /** The Player state after the Outcome, before Discovery. */
  state: PlayerState
  /** Knowledge the target may give up this Turn (CONTEXT.md: Allowed reveal). */
  allowedReveals: EntryOfKind<"knowledge">[]
  /** Clues the action makes findable this Turn (CONTEXT.md: Discoverable Clue). */
  discoverableClues: EntryOfKind<"clue">[]
  /** The off-script count to warn at in the story this Turn (2 or 3), or null. */
  warning: number | null
  /**
   * The Band this Turn is played in: before its penalty, which takes effect
   * from the next Turn. Reveals and the characters' behaviour both use it.
   */
  band: Band
}

/** What resolving the intent adds to the Outcome. */
type Acted = {
  action: Action
  state: PlayerState
  /** An Ending the action decided: a win. */
  decided: EndingCheck
  allowedReveals: EntryOfKind<"knowledge">[]
  discoverableClues: EntryOfKind<"clue">[]
}

const BAND_RANK: Record<Band, number> = { low: 0, normal: 1, high: 2 }

type Action = NonNullable<Outcome["action"]>
type Penalty = Outcome["penalty"]

const nothingFound = {
  allowedReveals: [],
  discoverableClues: [],
  decided: { ending: "none", reason: null },
} satisfies Partial<Acted>

function resolveMove(input: ResolveInput, state: PlayerState): Acted {
  const { target } = input
  const location =
    target.kind === "entry"
      ? liveOfKinds(input.entries, ["location"]).find((l) => l.id === target.id)
      : undefined
  if (!location) {
    return {
      action: {
        kind: "move_refused",
        summary:
          "There is no such place to go in this story: the Player character stays where they are.",
        reputationDelta: 0,
      },
      state,
      ...nothingFound,
    }
  }
  return {
    action: {
      kind: "moved",
      summary: `The Player character goes to ${location.name}.`,
      reputationDelta: 0,
    },
    state: { ...state, locationId: location.id },
    ...nothingFound,
  }
}

function resolveQuestion(input: ResolveInput, state: PlayerState): Acted {
  const { target } = input
  const person =
    target.kind === "entry"
      ? liveOfKinds(input.entries, ["character", "npc"]).find(
          (c) => c.id === target.id && !c.data.isPlayer
        )
      : undefined
  if (!person) {
    return {
      action: {
        kind: "questioned",
        summary: "There is no one here by that name to answer.",
        reputationDelta: 0,
      },
      state,
      ...nothingFound,
    }
  }
  const band = BAND_RANK[bandFor(state.reputation)]
  const revealed = new Set(state.knowledgeRevealed[person.id] ?? [])
  const allowedReveals = liveOfKinds(input.entries, ["knowledge"]).filter(
    (k) =>
      k.data.characterId === person.id &&
      BAND_RANK[k.data.minBand] <= band &&
      !revealed.has(k.id)
  )
  return {
    action: {
      kind: "questioned",
      summary:
        allowedReveals.length > 0
          ? `${person.name} may reveal what they know at this Band.`
          : `${person.name} has nothing more to reveal at this Band.`,
      reputationDelta: 0,
    },
    state,
    ...nothingFound,
    allowedReveals,
  }
}

function resolveExamine(input: ResolveInput, state: PlayerState): Acted {
  const found = new Set(state.cluesFound)
  const discoverableClues = liveOfKinds(input.entries, ["clue"]).filter(
    (c) => c.data.locationId === state.locationId && !found.has(c.id)
  )
  return {
    action: {
      kind: "examined",
      summary:
        discoverableClues.length > 0
          ? "Something here can be found."
          : "There is nothing new to find here.",
      reputationDelta: 0,
    },
    state,
    ...nothingFound,
    discoverableClues,
  }
}

/** The verb as the Brief spells it, compared loosely. */
function sameVerb(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

function resolveDecisive(
  input: ResolveInput,
  state: PlayerState,
  verb: string
): Acted {
  const actions = liveOfKinds(input.entries, ["decisive_action"]).filter((a) =>
    sameVerb(a.data.verb, verb)
  )
  const { target } = input
  const onTarget =
    target.kind === "entry"
      ? actions.find((a) => a.data.correctTargetId === target.id)
      : undefined
  const targetName =
    target.kind === "entry"
      ? (input.entries.find((e) => e.id === target.id)?.name ?? "that target")
      : "no one in the story"

  if (!onTarget) {
    const penalty =
      actions[0]?.data.wrongTargetPenalty ?? ENGINE_CONFIG.wrongTargetPenalty
    return {
      action: {
        kind: "decisive_wrong_target",
        summary: `Trying to ${verb} ${targetName} fails: it is the wrong target.`,
        reputationDelta: -penalty,
      },
      state,
      ...nothingFound,
    }
  }

  // Clues found count even if the Author removed them later (spec §7.2).
  const found = new Set(state.cluesFound)
  const have = onTarget.data.requires.filter((id) => found.has(id)).length
  const need = onTarget.data.requiresCount ?? onTarget.data.requires.length
  if (have < need) {
    return {
      action: {
        kind: "decisive_premature",
        summary: `Trying to ${verb} ${targetName} fails: it comes too early, with ${have} of the ${need} Clues it needs.`,
        reputationDelta: -onTarget.data.prematurePenalty,
      },
      state,
      ...nothingFound,
    }
  }
  const wins = onTarget.data.onSuccess === "win"
  return {
    action: {
      kind: "decisive_success",
      summary: `Trying to ${verb} ${targetName} succeeds.`,
      reputationDelta: 0,
    },
    state,
    ...nothingFound,
    decided: wins
      ? {
          ending: "win",
          reason: `Won: ${onTarget.name.trim() || "the Decisive action"} succeeded, and it wins the story.`,
        }
      : nothingFound.decided,
  }
}

function resolveAction(input: ResolveInput, state: PlayerState): Acted {
  switch (input.intent.kind) {
    case "move":
      return resolveMove(input, state)
    case "question":
      return resolveQuestion(input, state)
    case "examine":
      return resolveExamine(input, state)
    case "decisive":
      return resolveDecisive(input, state, input.intent.verb)
    default:
      return {
        action: {
          kind: "narrated",
          summary: "The action is narrated; it changes nothing code tracks.",
          reputationDelta: 0,
        },
        state,
        ...nothingFound,
      }
  }
}

function deathOdds(arcIndex: number) {
  const odds = ENGINE_CONFIG.deathOddsPerArc
  return odds[Math.min(arcIndex, odds.length - 1)]
}

function penaltyFor(
  classification: Classification,
  deathRoll: Penalty["deathRoll"]
): Penalty {
  if (classification === "off_script") {
    return {
      kind: "off_script",
      summary: `Off-script: Reputation -${ENGINE_CONFIG.offScriptPenalty} and one more off-script action.`,
      reputationDelta: -ENGINE_CONFIG.offScriptPenalty,
      offScriptDelta: 1,
      deathRoll: null,
    }
  }
  if (classification === "reckless" && deathRoll) {
    return {
      kind: "reckless",
      summary: deathRoll.lethal
        ? "Reckless, and the death roll was lethal."
        : "Reckless: the Player character survived the death roll.",
      reputationDelta: 0,
      offScriptDelta: 0,
      deathRoll,
    }
  }
  return {
    kind: "none",
    summary: "No penalty.",
    reputationDelta: 0,
    offScriptDelta: 0,
    deathRoll: null,
  }
}

export function resolve(input: ResolveInput): Resolution {
  const before = input.state
  const roll =
    input.classification === "reckless"
      ? (() => {
          const odds = deathOdds(before.arcIndex)
          return { odds, roll: input.deathRoll, lethal: input.deathRoll < odds }
        })()
      : null
  const penalty = penaltyFor(input.classification, roll)

  if (roll?.lethal) {
    const reason = "Death: the Player character's reckless action killed them."
    return {
      outcome: { action: null, penalty, ending: "death", endingReason: reason },
      state: { ...before, ending: "death" },
      allowedReveals: [],
      discoverableClues: [],
      warning: null,
      band: bandFor(before.reputation),
    }
  }

  const acted = resolveAction(input, before)
  const offScriptCount = acted.state.offScriptCount + penalty.offScriptDelta
  const reputation = clampReputation(
    acted.state.reputation +
      acted.action.reputationDelta +
      penalty.reputationDelta
  )
  const ended = checkEnding({ reputation, offScriptCount }, acted.decided)
  const warning =
    ended.ending === "none" &&
    penalty.offScriptDelta > 0 &&
    (ENGINE_CONFIG.offScriptWarningsAt as readonly number[]).includes(
      offScriptCount
    ) &&
    !acted.state.warningsGiven.includes(offScriptCount)
      ? offScriptCount
      : null
  return {
    outcome: {
      action: acted.action,
      penalty,
      ending: ended.ending,
      endingReason: ended.reason,
    },
    state: {
      ...acted.state,
      reputation,
      offScriptCount,
      warningsGiven:
        warning === null
          ? acted.state.warningsGiven
          : [...acted.state.warningsGiven, warning],
      ending: ended.ending,
    },
    allowedReveals: acted.allowedReveals,
    discoverableClues: acted.discoverableClues,
    warning,
    band: bandFor(before.reputation),
  }
}
