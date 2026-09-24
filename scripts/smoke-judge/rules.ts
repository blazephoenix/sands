/**
 * The Rule questions of spec §10.3, worded as the spec words them, with the
 * §10.1 conventions: each is a Noul asking "does the Draft violate X?", with
 * `criteria` saying what yes and no mean, pointing into the state by path.
 *
 * This is a smoke-test copy, not the Rule catalog (`src/rules/`, spec §5.1).
 */
import { noul, type NoulQuestion } from "@/models/judge"

import type { Character, TurnContext } from "./world"

export type RuleName =
  | "Character drift"
  | "Arc"
  | "Location"
  | "Knowledge"
  | "Unplanned clue"
  | "Outcome"
  | "Agency"
  | "Period"
  | "Codex"
  | "Reputation"
  | "Voice"
  | "Ending"

export interface RuleQuestion {
  /** Question id; unique within one Judge call. */
  id: string
  rule: RuleName
  /** Which of the Rule's questions this is, e.g. "location.new_place". */
  check: string
  question: NoulQuestion
}

/**
 * Every Rule question for one Draft.
 *
 * @param at Path to the Turn's state, "" when the state is the Turn itself.
 * @param index The Draft's index in `drafts`.
 */
export function ruleQuestions(
  turn: TurnContext,
  text: string,
  at: string,
  index: number,
  idPrefix: string
): RuleQuestion[] {
  const p = (field: string) => `\`${at}${field}\``
  const draft = p(`drafts[${index}]`)
  const out: RuleQuestion[] = []
  const add = (
    check: string,
    rule: RuleName,
    instructions: string,
    yes: string,
    no: string
  ) =>
    out.push({
      id: `${idPrefix}.${check}`,
      rule,
      check,
      question: noul(instructions, { true: yes, false: no }),
    })

  for (const character of namedIn(text, turn.characters)) {
    add(
      `character_drift.${slug(character.name)}`,
      "Character drift",
      `Does anything ${character.name} says or does in ${draft} contradict their personality or backstory in ${p("codex.characters")}?`,
      `${character.name} speaks or acts against their stated personality or backstory.`,
      `${character.name} behaves consistently with their personality and backstory.`
    )
  }
  add(
    "arc",
    "Arc",
    `Does ${draft} depict events from ${p("later_arcs")}, or contradict ${p("current_arc")}?`,
    "The Draft shows something that belongs to a later Arc, or contradicts the current Arc.",
    "Everything in the Draft fits the current Arc."
  )
  add(
    "location.setting",
    "Location",
    `Is ${draft} set somewhere other than ${p("current_location")}, or does it contradict that location's entry in ${p("codex.locations")}?`,
    "The scene takes place somewhere else, or describes the location against its entry.",
    "The scene takes place at the current location and matches its entry. Detail inside the location, such as a back room, is allowed."
  )
  add(
    "location.new_place",
    "Location",
    `Does ${draft} introduce a named place a character could travel to that is not in ${p("codex.locations")}?`,
    "The Draft names a new place (a pub, street, building or district) that someone could go to.",
    "Every named place is in the Codex, or is only detail inside the current location."
  )
  add(
    "knowledge.character",
    "Knowledge",
    `Does a character in ${draft} reveal information that is not in ${p("allowed_reveals")} or ${p("knowledge_revealed")}?`,
    "A character tells the Player character a fact beyond the allowed reveals and what is already revealed.",
    "Characters reveal nothing beyond the allowed reveals and what is already revealed."
  )
  add(
    "knowledge.narration",
    "Knowledge",
    `Does the narration of ${draft} reveal or imply ${p("hidden_truth")} beyond what ${p("clues_found")} supports?`,
    "The narration states or hints at the hidden truth further than the found Clues support.",
    "The narration keeps the hidden truth hidden beyond what the found Clues support."
  )
  add(
    "unplanned_clue",
    "Unplanned clue",
    `Does ${draft} present evidence pointing to ${p("hidden_truth")} that is not one of ${p("discoverable_clues")} or ${p("clues_found")}?`,
    "The Draft introduces a new piece of evidence that points toward the hidden truth.",
    "Any evidence in the Draft is a discoverable or found Clue, or points nowhere."
  )
  add(
    "outcome",
    "Outcome",
    `Does ${draft} contradict ${p("outcome")}?`,
    "The Draft narrates a result different from the resolved outcome.",
    "The Draft narrates the resolved outcome."
  )
  add(
    "agency",
    "Agency",
    `Does the Player character in ${draft} say or do more than ${p("player_input")}?`,
    "The Player character takes actions or says things the Player did not write.",
    "The Player character does and says only what the input describes, perhaps in other words."
  )
  add(
    "period",
    "Period",
    `Does ${draft} contain anachronisms for ${p("setting")}?`,
    "The Draft mentions an object, word, technology or custom that did not exist in the setting's period.",
    "Everything in the Draft fits the period."
  )
  add(
    "codex.contradiction",
    "Codex",
    `Does ${draft} contradict an entry in ${p("codex")}?`,
    "The Draft states something about a place or character that conflicts with its Codex entry.",
    "Nothing in the Draft conflicts with a Codex entry."
  )
  add(
    "codex.rejected",
    "Codex",
    `Does ${draft} mention anything in ${p("rejected_names")}?`,
    "The Draft names or clearly refers to a rejected Entry.",
    "The Draft mentions no rejected Entry."
  )
  add(
    "reputation",
    "Reputation",
    `Does NPC behavior toward the Player character in ${draft} contradict ${p("reputation_band")}?`,
    "Characters treat the Player character in a way the Band's guidance rules out.",
    "Characters treat the Player character as the Band's guidance describes."
  )
  if (turn.hasVoice) {
    add(
      "voice",
      "Voice",
      `Does ${draft} depart from ${p("voice")}?`,
      "The prose breaks the voice guidance: person, tense, style or diction.",
      "The prose follows the voice guidance."
    )
  }
  if (turn.endingTurn) {
    add(
      "ending",
      "Ending",
      `Does ${draft} narrate an ending other than ${p("ending")}?`,
      "The story ends differently from the ending code decided.",
      "The Draft narrates the decided ending."
    )
  }
  return out
}

/** Characters named in the Draft, by name or alias (spec §10.3). */
export function namedIn(text: string, characters: Character[]): Character[] {
  const lower = text.toLowerCase()
  return characters.filter((character) =>
    [character.name, ...character.aliases].some((name) =>
      new RegExp(`\\b${escape(name.toLowerCase())}\\b`).test(lower)
    )
  )
}

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_")
}
