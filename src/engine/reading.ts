/**
 * The Reading (spec §9.1 step 2; ADR-0009): one Judge call of three choice
 * questions about the Player's input, its intent, its target and its
 * Classification, each with an escape option. Building the questions and
 * reading the answers are pure; the Turn loop makes the call.
 *
 * Option keys are what Jev chooses among, so targets are offered by name and
 * mapped back to Entry ids here. A Classification whose confidence is below
 * the floor is treated as tangential.
 */
import type { Brief } from "@/domain/brief"
import {
  ENTRY_KIND_LABELS,
  isLiveEntry,
  type Entry,
  type EntryOfKind,
} from "@/domain/entry"
import type { Classification, PlayerState, TurnLog } from "@/domain/session"
import {
  choice,
  MAX_CHOICE_OPTIONS,
  type ChoiceAnswer,
  type JudgeJson,
} from "@/models/judge"

import { ENGINE_CONFIG } from "./config"
import type { Intent, Target } from "./resolve"

const BASIC_INTENTS = {
  move: "Go to another place.",
  examine: "Look at, search or study something here.",
  question: "Ask a character something, or talk with them.",
} as const

const CLASSIFICATIONS = {
  on_script:
    "Moves the story forward in the current Arc, as the Brief means it to go.",
  tangential:
    "Plausible for the Player character but beside the current Arc: small talk, looking around, a detour.",
  off_script:
    "Goes against the Player character's role or the story's premise, or tries to break out of the story, without risking their life.",
  reckless: "Puts the Player character's life in serious danger.",
} satisfies Record<Classification, string>

const TARGET_KINDS = ["location", "character", "npc", "object"] as const

export type ReadingInput = {
  brief: Brief
  entries: readonly Entry[]
  state: PlayerState
  playerInput: string
  /** The Passage the Player is answering. */
  lastPassage: string
}

function describe(entry: Entry) {
  const kind = ENTRY_KIND_LABELS[entry.kind].singular
  const text = entry.description.trim()
  return text ? `${kind}: ${text}` : kind
}

/** The three questions, the Judge state they share, and target option -> Entry id. */
export function readingQuestions(input: ReadingInput) {
  const live = input.entries.filter(isLiveEntry)
  const verbs = [
    ...new Set(
      live
        .filter(
          (e): e is EntryOfKind<"decisive_action"> =>
            e.kind === "decisive_action"
        )
        .map((e) => e.data.verb.trim())
        .filter((v) => v && !(v in BASIC_INTENTS) && v !== "other")
    ),
  ]
  const intentCriteria: Record<string, string> = { ...BASIC_INTENTS }
  for (const verb of verbs)
    intentCriteria[verb] = `A story-critical action: to ${verb} someone.`
  intentCriteria.other = "None of the above."

  const targets = new Map<string, string>()
  const targetCriteria: Record<string, string> = {}
  const reserved = new Set(["none", "not_in_codex"])
  const candidates = live.filter(
    (e) =>
      (TARGET_KINDS as readonly string[]).includes(e.kind) &&
      !(e.kind === "character" && e.data.isPlayer)
  )
  for (const entry of candidates.slice(0, MAX_CHOICE_OPTIONS - 2)) {
    const base = entry.name.trim() || ENTRY_KIND_LABELS[entry.kind].singular
    let key = base
    for (let n = 2; targets.has(key) || reserved.has(key); n++)
      key = `${base} (${n})`
    targets.set(key, entry.id)
    targetCriteria[key] = describe(entry)
  }
  targetCriteria.none = "The action is not aimed at anyone or anything."
  targetCriteria.not_in_codex =
    "The action is aimed at a person, place or thing that is not in this list."

  const byId = new Map(input.entries.map((e) => [e.id, e]))
  const player = live.find((e) => e.kind === "character" && e.data.isPlayer)
  const arc = input.brief.arcs[input.state.arcIndex]
  const state: { [key: string]: JudgeJson } = {
    player_input: input.playerInput,
    player_character: player?.name ?? "",
    current_location: byId.get(input.state.locationId)?.name ?? "",
    current_arc: arc ? { name: arc.name, description: arc.description } : null,
    story_premise: {
      arcs: input.brief.arcs.map((a) => a.name),
      ending: input.brief.ending.condition,
    },
    last_passage: input.lastPassage,
  }

  return {
    state,
    targets,
    questions: {
      intent: choice(
        "What kind of action does `player_input` describe?",
        intentCriteria
      ),
      target: choice(
        "Which person, place or thing is `player_input` aimed at?",
        targetCriteria
      ),
      classification: choice(
        "How does `player_input` relate to the story, given `current_arc` and `story_premise`?",
        CLASSIFICATIONS
      ),
    },
  }
}

export type ReadingAnswers = {
  intent: ChoiceAnswer<string>
  target: ChoiceAnswer<string>
  classification: ChoiceAnswer<Classification>
}

export type Reading = {
  intent: Intent
  target: Target
  /** After the confidence floor. */
  classification: Classification
  log: NonNullable<TurnLog["reading"]>
}

const probabilityOf = (answer: ChoiceAnswer<string>) =>
  answer.probabilities[answer.choice] ?? answer.confidence

export function readReading(
  answers: ReadingAnswers,
  targets: ReadonlyMap<string, string>
): Reading {
  const verb = answers.intent.choice
  const intent: Intent =
    verb === "move" ||
    verb === "examine" ||
    verb === "question" ||
    verb === "other"
      ? { kind: verb }
      : { kind: "decisive", verb }
  const picked = answers.target.choice
  const id = targets.get(picked)
  const target: Target = id
    ? { kind: "entry", id }
    : picked === "not_in_codex"
      ? { kind: "not_in_codex" }
      : { kind: "none" }
  const belowFloor =
    answers.classification.confidence < ENGINE_CONFIG.choiceConfidenceFloor
  return {
    intent,
    target,
    classification: belowFloor ? "tangential" : answers.classification.choice,
    log: {
      intent: { value: verb, probability: probabilityOf(answers.intent) },
      target: {
        value: id ?? picked,
        label: picked,
        probability: probabilityOf(answers.target),
      },
      classification: {
        value: answers.classification.choice,
        probability: probabilityOf(answers.classification),
        belowFloor,
      },
    },
  }
}
