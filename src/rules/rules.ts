/**
 * The Rule catalog (spec §10): each Rule builds its Judge questions for one
 * Draft, holds its feedback template, and the Judge's answers are read into
 * verdicts here. Pure; the Round loop (`engine/turn.ts`) makes the call.
 *
 * Conventions (spec §10.1; research §1–2):
 * - Every question is a Noul where yes means "the Draft breaks the Rule",
 *   with both criteria spelled out and one condition per question.
 * - Questions point into the Judge state by backticked path (`drafts[i]`).
 *   Where a question is about one Entry or one guideline, that data sits
 *   beside it in structured instructions, which the smoke test found
 *   sharper than pointing into a list.
 * - The `false` criteria say what does not count; the smoke test's false
 *   alarms came from Rules that left it open.
 * - Wording names story mechanics only. The game is genre-agnostic.
 */
import type { CodexSlice } from "@/codex/slice"
import { namedEntries } from "@/codex/slice"
import { hiddenTruth, type Brief } from "@/domain/brief"
import {
  isLiveEntry,
  type Band,
  type Entry,
  type EntryOfKind,
} from "@/domain/entry"
import {
  RULE_LABELS,
  type Discovery,
  type Outcome,
  type PlayerState,
  type Rule,
  type RuleResult,
} from "@/domain/session"
import { ENGINE_CONFIG, ruleVerdict } from "@/engine/config"
import type { Directive } from "@/engine/direct"
import { noul, type JudgeJson, type NoulQuestion } from "@/models/judge"
import { entryForJudge } from "@/setup/validate"

/** Marks the Hidden truth wherever the Judge or the Writer reads an Entry. */
export const JUDGE_HIDDEN_MARKER = "[HIDDEN]"

/** Everything the Rules need to know about one Turn's scene. */
export type SceneContext = {
  brief: Brief
  /** The Session's Codex, removed Entries included. */
  entries: readonly Entry[]
  /** The Player state the scene is written in: after the Outcome. */
  state: PlayerState
  /** Null for the Opening. */
  playerInput: string | null
  /** Null for the Opening. */
  outcome: Outcome | null
  directive: Directive
  slice: CodexSlice
  allowedReveals: readonly EntryOfKind<"knowledge">[]
  discoverableClues: readonly EntryOfKind<"clue">[]
}

/** One Rule question about one Draft. */
export type RuleQuestion = {
  rule: Rule
  /** The question in plain words, for the harness pane. */
  label: string
  question: NoulQuestion
  /** What to tell the Writer when this question clearly fails (spec §10.4). */
  feedback: string
}

type Json = { [key: string]: JudgeJson }

const TYPED_HIDDEN_KEYS = ["role", "age", "personality", "backstory"] as const

/**
 * An Entry as a model reads it, with its Hidden fields marked. References to
 * removed Entries are left out, so a removed name never reaches the Writer.
 */
export function entryForScene(
  entry: Entry,
  byId: ReadonlyMap<string, Entry>,
  marker: string
): Json {
  const live = new Map([...byId].filter(([, e]) => isLiveEntry(e)))
  const shown = entryForJudge(entry, live)
  if (entry.kind !== "character" && entry.kind !== "npc") return shown
  const hidden = new Set(entry.data.hiddenFields)
  for (const key of TYPED_HIDDEN_KEYS) {
    const value = shown[key]
    if (hidden.has(key) && typeof value === "string" && value.trim())
      shown[key] = `${marker} ${value}`
  }
  if (Array.isArray(shown.key_facts)) {
    shown.key_facts = entry.keyFacts.map((fact) => {
      const label = fact.split(":")[0]?.trim() ?? ""
      return hidden.has(label) ? `${marker} ${fact}` : fact
    })
  }
  if (entry.data.isPlayer) shown.player_character = true
  return shown
}

function liveByKind<K extends Entry["kind"]>(
  entries: readonly Entry[],
  kinds: readonly K[]
) {
  return entries.filter(
    (e): e is EntryOfKind<K> =>
      (kinds as readonly string[]).includes(e.kind) && isLiveEntry(e)
  )
}

function playerName(context: SceneContext) {
  return context.directive.playerCharacter
}

/** The Judge state of spec §10.2 for one Round. */
export function judgeState(context: SceneContext, drafts: readonly string[]) {
  const { brief, entries, state, directive } = context
  const byId = new Map(entries.map((e) => [e.id, e]))
  const name = (id: string) => byId.get(id)?.name ?? ""
  const revealed = Object.values(state.knowledgeRevealed)
    .flat()
    .map((id) => byId.get(id))
    .filter((k): k is EntryOfKind<"knowledge"> => k?.kind === "knowledge")
  return {
    drafts: [...drafts],
    player_character: playerName(context),
    player_input:
      context.playerInput ??
      "(none: this is the Opening, before the Player acts)",
    outcome:
      context.outcome === null
        ? "(none: this is the Opening)"
        : (context.outcome.action?.summary ?? context.outcome.penalty.summary),
    current_location: directive.location,
    current_arc: {
      name: directive.arc.name,
      description: directive.arc.description,
      exit_conditions: directive.arc.exitConditions,
    },
    later_arcs: brief.arcs.slice(state.arcIndex + 1).map((arc) => ({
      name: arc.name,
      description: arc.description,
    })),
    setting: brief.settings.map((s) => ({ place: s.place, period: s.period })),
    voice: brief.voices.map((v) => v.guidelines).filter((g) => g.trim()),
    codex: context.slice.writer.map((e) =>
      entryForScene(e, byId, JUDGE_HIDDEN_MARKER)
    ),
    known_places: liveByKind(entries, ["location"]).map((l) => l.name),
    rejected_names: context.slice.rejectedNames,
    allowed_reveals: directive.allowedReveals,
    discoverable_clues: directive.discoverableClues,
    knowledge_revealed: revealed.map((k) => ({
      character: name(k.data.characterId),
      fact: k.data.fact,
    })),
    clues_found: state.cluesFound
      .map((id) => byId.get(id))
      .filter((c): c is EntryOfKind<"clue"> => c?.kind === "clue")
      .map((c) => ({ name: c.name, reveals: c.data.reveals })),
    reputation_band: { band: directive.band, guidance: directive.bandGuidance },
    hidden_truth: hiddenTruth(brief)
      .map((h) => h.text.trim())
      .filter(Boolean),
    ending: directive.ending?.instruction ?? null,
  }
}

function hasSetting(brief: Brief) {
  return brief.settings.some((s) => s.place.trim() || s.period.trim())
}

/** The Author's Voice guidelines, one per line or sentence. */
export function voiceGuidelines(brief: Brief): string[] {
  return brief.voices
    .flatMap((v) => v.guidelines.split(/\n+|(?<=[.!?])\s+(?=\p{Lu})/u))
    .map((g) => g.trim())
    .filter(Boolean)
    .slice(0, 8)
}

const REPUTATION_QUESTIONS: Record<
  "contempt" | "deference" | "coldness" | "warmth",
  { question: string; label: string }
> = {
  contempt: {
    question:
      "Does any character in `drafts[i]` treat `player_character` with open contempt: insults, jeering, or refusing a fair request?",
    label: "Does a character treat the Player character with open contempt?",
  },
  deference: {
    question:
      "Does any character in `drafts[i]` treat `player_character` with special deference: gifts, flattery or favours?",
    label:
      "Does a character treat the Player character with special deference?",
  },
  coldness: {
    question:
      "Does any character in `drafts[i]` treat `player_character` with suspicion or coldness the scene gives them no reason for?",
    label:
      "Does a character treat the Player character with unearned suspicion or coldness?",
  },
  warmth: {
    question:
      "Does any character in `drafts[i]` treat `player_character` with warmth or trust: confiding freely, or going out of their way to help?",
    label: "Does a character treat the Player character with warmth or trust?",
  },
}

/** What each Band forbids, in two concrete questions (research §2). */
const REPUTATION_BY_BAND: Record<Band, (keyof typeof REPUTATION_QUESTIONS)[]> =
  {
    high: ["contempt", "coldness"],
    normal: ["contempt", "deference"],
    low: ["deference", "warmth"],
  }

/** Replaces the `drafts[i]` placeholder with the Draft's index. */
function at(text: string, index: number) {
  return text.replaceAll("`drafts[i]`", `\`drafts[${index}]\``)
}

/** Every Rule question for Draft `index`, whose text is `draft`. */
export function ruleQuestions(
  context: SceneContext,
  index: number,
  draft: string
): RuleQuestion[] {
  const { brief, entries, state, directive } = context
  const byId = new Map(entries.map((e) => [e.id, e]))
  const out: RuleQuestion[] = []
  const add = (
    rule: Rule,
    label: string,
    instructions: string | Json,
    criteria: { true: string; false: string },
    feedback: string
  ) => {
    const text =
      typeof instructions === "string"
        ? at(instructions, index)
        : {
            ...instructions,
            question: at(String(instructions.question), index),
          }
    out.push({
      rule,
      label,
      question: noul(text, {
        true: at(criteria.true, index),
        false: at(criteria.false, index),
      }),
      feedback,
    })
  }

  // Character drift: per character the Draft names, never the Player character.
  const people = liveByKind(entries, ["character", "npc"])
  for (const person of namedEntries(draft, people)) {
    if (person.kind !== "character" && person.kind !== "npc") continue
    if (person.data.isPlayer) continue
    add(
      "character_drift",
      `Does ${person.name} act against their personality or backstory?`,
      {
        question:
          "Does anything `character.name` says or does in `drafts[i]` go against `character.personality` or `character.backstory`?",
        character: entryForScene(person, byId, JUDGE_HIDDEN_MARKER),
      },
      {
        true: "The character says or does something their personality or backstory rules out.",
        false:
          "Behaviour the entry allows is not drift, including rudeness, fear, courage or silence the entry allows. What the entry does not mention is not drift.",
      },
      `${person.name} acts against their personality or backstory. Keep them as their Codex entry describes them.`
    )
  }

  // Arc.
  if (state.arcIndex + 1 < brief.arcs.length) {
    add(
      "arc",
      "Does the Draft show events from a later Arc?",
      "Does `drafts[i]` show events from `later_arcs`?",
      {
        true: "Something that belongs to a later Arc happens in this scene.",
        false:
          "The scene stays within `current_arc`. Mentioning a later Arc's people or places is not showing its events.",
      },
      "the Draft jumps ahead to a later Arc. Keep to the current Arc."
    )
  }
  add(
    "arc",
    "Does the Draft contradict the current Arc?",
    "Does `drafts[i]` contradict `current_arc`?",
    {
      true: "The scene shows something the current Arc's description rules out.",
      false:
        "The scene fits `current_arc`, including things its description does not mention.",
    },
    "the Draft contradicts the current Arc. Keep to what the Arc describes."
  )

  // Location.
  add(
    "location",
    "Is the Draft set somewhere other than the current Location?",
    "Does `drafts[i]` take place somewhere other than `current_location`?",
    {
      true: "The scene is set somewhere other than `current_location`.",
      false:
        "The scene is at `current_location`. Arriving there, places seen or mentioned from there, and detail inside it, such as a back room, all count as being there.",
    },
    `the Draft is set away from ${directive.location.name}. Set the scene there.`
  )
  add(
    "location",
    "Does the Draft describe the current Location against its entry?",
    "Does `drafts[i]` describe `current_location` against its description?",
    {
      true: "The Draft describes the place in a way its description rules out.",
      false:
        "What the description does not mention is not a conflict, and neither are weather, light or crowds.",
    },
    `the Draft describes ${directive.location.name} against its Codex entry. Keep to the entry.`
  )
  add(
    "location",
    "Does the Draft name a new place to travel to?",
    "Does `drafts[i]` name a place a character could travel to that is not in `known_places`?",
    {
      true: "The Draft names a new place, such as a town, a building or a street, that is not in `known_places` and that a character could go to.",
      false:
        "Every place a character could go to is in `known_places`. Unnamed detail inside the current location is description, not a new place.",
    },
    "the Draft invents a place that is not in the Codex. Mention only known places."
  )

  // Knowledge.
  add(
    "knowledge",
    "Does a character reveal information that is not allowed?",
    "Does a character in `drafts[i]` reveal information that is not in `allowed_reveals` or `knowledge_revealed`?",
    {
      true: "A character states or gives away information: a fact about a character, meaning what they look like, carry, did, saw or know, or where they are or went, that is not in `allowed_reveals` or `knowledge_revealed`.",
      false:
        "Every such fact a character gives is in `allowed_reveals`, `knowledge_revealed` or `codex` without a [HIDDEN] mark. Manner, mood, weather and scenery are not information.",
    },
    "a character reveals a fact beyond the Allowed reveals. Give each reveal exactly as written and add no new fact about any character."
  )
  add(
    "knowledge",
    "Does the narration give away the Hidden truth?",
    "Leaving aside what characters say aloud, does the narrator of `drafts[i]` state or hint at `hidden_truth` beyond what `clues_found` supports?",
    {
      true: "The narration itself, not dialogue, states or hints at part of `hidden_truth` that `clues_found` does not support.",
      false:
        "The narration gives nothing of `hidden_truth` beyond `clues_found`. What characters say aloud does not count for this question.",
    },
    "the narration hints at the Hidden truth. Remove the hint."
  )

  // Unplanned clue.
  add(
    "unplanned_clue",
    "Does the Draft plant a Clue that is not planned?",
    "Does `drafts[i]` present a fact pointing to `hidden_truth` that is not one of `discoverable_clues` or `clues_found`?",
    {
      true: "The Draft adds a sign, an object or a detail that points toward `hidden_truth` and is not one of `discoverable_clues` or `clues_found`.",
      false:
        "Every detail pointing toward `hidden_truth` is one of `discoverable_clues` or `clues_found`, or nothing points toward it.",
    },
    "the Draft adds a detail that points to the Hidden truth and is not a planned Clue. Remove it."
  )

  // Outcome, after the Opening only.
  if (context.outcome) {
    add(
      "outcome",
      "Does the Draft contradict the Outcome?",
      "Does `drafts[i]` contradict `outcome`?",
      {
        true: "The Draft narrates a different result from `outcome`: an action succeeding that failed, failing that succeeded, or a move that did not happen.",
        false: "The Draft narrates `outcome`, in any words.",
      },
      "the Draft narrates a different result from the Outcome. Narrate what happened, as given."
    )
  }

  // Agency.
  if (context.playerInput === null) {
    add(
      "agency",
      "Does the Player character do more than arrive?",
      "Does `player_character` do more in `drafts[i]` than arrive and take in the scene?",
      {
        true: "The Player character acts, decides or speaks beyond arriving, looking and listening.",
        false:
          "The Player character only arrives, looks and listens; the Player acts next. What other characters do does not count.",
      },
      "the Player character acts in the Opening. Have them only arrive; the Player acts next."
    )
  } else {
    add(
      "agency",
      "Does the Player character say or do more than the Player's input?",
      "Does `player_character` say or do more in `drafts[i]` than `player_input`?",
      {
        true: "The Player character takes an action, makes a decision or speaks words beyond what `player_input` says.",
        false:
          "The Player character does only what `player_input` says, in any words. What other characters do, and what the Player character sees or hears, do not count.",
      },
      "the Player character says or does more than the Player's input. Rewrite without adding their words or actions."
    )
  }

  // Period, when the Brief has a setting.
  if (hasSetting(brief)) {
    add(
      "period",
      "Does the Draft contain something that could not exist in the setting?",
      "Does `drafts[i]` contain something that could not exist in `setting`?",
      {
        true: "An object, technology, custom, phrase or institution that the place and time in `setting` does not have.",
        false:
          "Everything in the Draft could exist in `setting`, including things it allows but does not mention.",
      },
      "the Draft has something that could not exist in the setting. Remove it."
    )
  }

  // Codex: per Entry the Draft names, and removed names.
  const things = liveByKind(entries, [
    "location",
    "character",
    "npc",
    "faction",
    "object",
  ])
  for (const entry of namedEntries(draft, things)) {
    add(
      "codex",
      `Does the Draft conflict with ${entry.name}?`,
      {
        question:
          "Does `drafts[i]` state something that conflicts with `entry`?",
        entry: entryForScene(entry, byId, JUDGE_HIDDEN_MARKER),
      },
      {
        true: "The Draft makes something in `entry` false: a name, role, age, relationship, place or past event.",
        false:
          "Everything the Draft says can be true alongside `entry`. What the entry does not mention is not a conflict.",
      },
      `the Draft contradicts the Codex entry for ${entry.name}. Keep to the entry.`
    )
  }
  if (context.slice.rejectedNames.length > 0) {
    add(
      "codex",
      "Does the Draft mention a removed Entry?",
      "Does `drafts[i]` mention anything named in `rejected_names`?",
      {
        true: "A person, place or thing named in `rejected_names` appears or is mentioned.",
        false: "Nothing named in `rejected_names` appears.",
      },
      "the Draft brings back something the Author removed. Leave it out."
    )
  }

  // Reputation: two concrete questions for the Band.
  for (const key of REPUTATION_BY_BAND[directive.band]) {
    const { question, label } = REPUTATION_QUESTIONS[key]
    add(
      "reputation",
      label,
      question,
      {
        true: "A character behaves that way toward the Player character.",
        false:
          "No character does. Behaviour `reputation_band.guidance` allows is not a violation, and neither is a reaction the scene itself gives a reason for.",
      },
      `characters do not treat the Player character as the ${directive.band} Band says. ${directive.bandGuidance}`
    )
  }

  // Voice: one question per guideline.
  for (const guideline of voiceGuidelines(brief)) {
    add(
      "voice",
      `Does the Draft break "${guideline}"?`,
      { question: "Does `drafts[i]` break `guideline`?", guideline },
      {
        true: "The Draft plainly goes against the guideline.",
        false:
          "The Draft follows the guideline, or the guideline does not apply to this scene.",
      },
      `the Draft breaks the Voice guideline "${guideline}". Follow it.`
    )
  }

  // Ending, on a Turn that decided one.
  if (directive.ending) {
    add(
      "ending",
      "Does the Draft narrate a different ending?",
      "Does `drafts[i]` narrate an ending other than `ending`?",
      {
        true: "The Draft ends the story differently from `ending`, or does not end it.",
        false: "The Draft narrates `ending` as the final scene.",
      },
      "the Draft does not narrate the Ending given. Write it as the final scene."
    )
  }

  return out
}

/** A Discovery question about one Draft. */
export type DiscoveryQuestion = {
  target: Discovery["target"]
  label: string
  question: NoulQuestion
}

/** Did Draft `index` reveal each Allowed reveal and each Discoverable Clue? */
export function discoveryQuestions(
  context: SceneContext,
  index: number
): DiscoveryQuestion[] {
  const byId = new Map(context.entries.map((e) => [e.id, e]))
  const knowledge = context.allowedReveals.map((k) => ({
    target: { kind: "knowledge" as const, entryId: k.id },
    label: `Did the Passage reveal "${k.data.fact}"?`,
    question: noul(
      {
        question: at(
          "Does `drafts[i]` give `player_character` the fact in `reveal`?",
          index
        ),
        reveal: {
          character: byId.get(k.data.characterId)?.name ?? "",
          fact: k.data.fact,
        },
      },
      {
        true: "The Player character learns the fact, in words or in what they see or hear.",
        false:
          "The fact is not given, or only hinted at too vaguely for the Player character to learn it.",
      }
    ),
  }))
  const clues = context.discoverableClues.map((c) => ({
    target: { kind: "clue" as const, entryId: c.id },
    label: `Did the Passage let the Player find "${c.name}"?`,
    question: noul(
      {
        question: at(
          "Does `drafts[i]` let `player_character` find what `clue` reveals?",
          index
        ),
        clue: { name: c.name, reveals: c.data.reveals },
      },
      {
        true: "The Player character finds it, and what it reveals is plain in the Draft.",
        false: "It is not found, or what it reveals is not given.",
      }
    ),
  }))
  return [...knowledge, ...clues]
}

export type DraftVerdict = {
  rules: RuleResult[]
  passed: boolean
  /** The highest probability among its Rule answers; the lower, the better. */
  highestViolation: number
}

/** A Draft's Rule answers, in question order, read into verdicts. */
export function readDraft(
  questions: readonly RuleQuestion[],
  probabilities: readonly number[]
): DraftVerdict {
  const rules = questions.map((q, i): RuleResult => {
    const probability = probabilities[i]
    return {
      rule: q.rule,
      question: q.label,
      probability,
      ...ruleVerdict(probability),
    }
  })
  return {
    rules,
    passed: rules.every((r) => !r.failed),
    highestViolation: Math.max(0, ...rules.map((r) => r.probability)),
  }
}

/**
 * Retry feedback (spec §10.4): one line per Rule question a Draft failed at
 * p >= 0.8, across the Round's Drafts, at its highest probability. Failures
 * below the floor still fail the Draft but add no line.
 */
export function retryFeedback(
  drafts: readonly {
    questions: readonly RuleQuestion[]
    result: DraftVerdict
  }[]
): string[] {
  const lines = new Map<string, { rule: Rule; p: number; feedback: string }>()
  for (const { questions, result } of drafts) {
    result.rules.forEach((answer, i) => {
      if (answer.probability < ENGINE_CONFIG.retryFeedbackFloor) return
      const q = questions[i]
      const seen = lines.get(q.label)
      if (!seen || seen.p < answer.probability)
        lines.set(q.label, {
          rule: q.rule,
          p: answer.probability,
          feedback: q.feedback,
        })
    })
  }
  return [...lines.values()].map(
    (line) =>
      `${RULE_LABELS[line.rule]} (${line.p.toFixed(2)}): ${line.feedback}`
  )
}

/**
 * Which Draft ships (spec §9.1 step 6): the passing Draft with the lowest
 * highest violation in the latest Round; null while Rounds remain and every
 * Draft failed; after the last Round, the least-violating Draft of any Round,
 * flagged.
 */
export function chooseShipped(
  rounds: readonly (readonly {
    id: string
    passed: boolean
    highestViolation: number
  }[])[],
  maxRounds: number
): { id: string; flagged: boolean } | null {
  const least = <T extends { highestViolation: number }>(list: readonly T[]) =>
    list.reduce((best, d) =>
      d.highestViolation < best.highestViolation ? d : best
    )
  const latest = rounds.at(-1) ?? []
  const passing = latest.filter((d) => d.passed)
  if (passing.length > 0) return { id: least(passing).id, flagged: false }
  if (rounds.length < maxRounds) return null
  return { id: least(rounds.flat()).id, flagged: true }
}
