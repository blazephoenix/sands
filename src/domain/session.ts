/**
 * Sessions and Turns (CONTEXT.md; spec §6 `sessions`, `turns`, Player state;
 * §9 for what a Turn log records; ADR-0003, ADR-0006).
 *
 * A Turn row is written only when a Passage ships. It holds the full Player
 * state after the Turn and the Turn's log. Background work (naming new
 * characters, Exit conditions, pacing) is merged into the latest Turn when it
 * finishes.
 */
import { z } from "zod"

export const endingSchema = z.enum(["none", "win", "death", "removed"])
export type Ending = z.infer<typeof endingSchema>

export const sessionSchema = z.object({
  id: z.string().min(1),
  worldId: z.string().min(1),
  mode: z.enum(["harness", "baseline"]),
  /** Seed for the seeded random generator, so a replay reproduces its Outcomes. */
  seed: z.number().int(),
  ending: endingSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})
export type Session = z.infer<typeof sessionSchema>

export const classificationSchema = z.enum(["on_script", "tangential", "off_script", "reckless"])
export type Classification = z.infer<typeof classificationSchema>

// Player state (spec §6 `state_json`).

export const playerStateSchema = z.object({
  locationId: z.string().min(1),
  /** 0-based index into the Brief's Arcs. */
  arcIndex: z.number().int().min(0),
  /** Clue Entry ids found so far, in the order found. */
  cluesFound: z.array(z.string()),
  /** Character or NPC Entry id -> Knowledge Entry ids revealed. */
  knowledgeRevealed: z.record(z.string(), z.array(z.string())),
  reputation: z.number(),
  offScriptCount: z.number().int().min(0),
  /** Off-script counts at which a warning was delivered in the story. */
  warningsGiven: z.array(z.number().int()),
  pacingNudge: z.object({ active: z.boolean(), reason: z.string().nullable() }),
  ending: endingSchema,
})
export type PlayerState = z.infer<typeof playerStateSchema>

// Turn log (spec §6 `log_json`, §9).

export const RULES = [
  "character_drift",
  "arc",
  "location",
  "knowledge",
  "unplanned_clue",
  "outcome",
  "agency",
  "period",
  "codex",
  "reputation",
  "voice",
  "ending",
] as const
export const ruleSchema = z.enum(RULES)
export type Rule = z.infer<typeof ruleSchema>

export const RULE_LABELS: Record<Rule, string> = {
  character_drift: "Character drift",
  arc: "Arc",
  location: "Location",
  knowledge: "Knowledge",
  unplanned_clue: "Unplanned Clue",
  outcome: "Outcome",
  agency: "Agency",
  period: "Period",
  codex: "Codex",
  reputation: "Reputation",
  voice: "Voice",
  ending: "Ending",
}

/** One Rule question asked of one Draft, with the Judge's probability that the Draft breaks it. */
export const ruleResultSchema = z.object({
  rule: ruleSchema,
  question: z.string(),
  probability: z.number().min(0).max(1),
  /** p >= 0.5 (spec §10.1). */
  failed: z.boolean(),
  /** 0.35 <= p < 0.65: the Judge was unsure either way. */
  flagged: z.boolean(),
})
export type RuleResult = z.infer<typeof ruleResultSchema>

export const draftSchema = z.object({
  id: z.string(),
  text: z.string(),
  rules: z.array(ruleResultSchema),
  /** The highest probability among its Rule results; the lower, the better. */
  highestViolation: z.number().min(0).max(1),
  passed: z.boolean(),
  /** The Draft that shipped as the Passage. Exactly one per Turn. */
  shipped: z.boolean(),
})
export type Draft = z.infer<typeof draftSchema>

/** One pass of the Writer producing Drafts in parallel and the Judge ruling on them. At most three per Turn. */
export const roundSchema = z.object({
  index: z.number().int().min(1).max(3),
  /** One line per failed Rule from the previous Round, given to the Writer (empty for Round 1). */
  feedback: z.array(z.string()),
  drafts: z.array(draftSchema),
})
export type Round = z.infer<typeof roundSchema>

const choiceAnswer = z.object({ value: z.string(), probability: z.number().min(0).max(1) })

export const outcomeSchema = z.object({
  kind: z.enum([
    "moved",
    "move_refused",
    "examined",
    "questioned",
    "decisive_success",
    "decisive_premature",
    "decisive_wrong_target",
    "off_script",
    "reckless_survived",
    "reckless_death",
    "narrated",
  ]),
  /** What code decided, in a sentence. */
  summary: z.string(),
  reputationDelta: z.number(),
  offScriptDelta: z.number().int(),
  /** Present for reckless actions: the seeded death roll. */
  deathRoll: z.object({ odds: z.number(), roll: z.number(), lethal: z.boolean() }).nullable(),
  ending: endingSchema,
})
export type Outcome = z.infer<typeof outcomeSchema>

export const discoverySchema = z.object({
  target: z.object({ kind: z.enum(["clue", "knowledge"]), entryId: z.string() }),
  question: z.string(),
  probability: z.number().min(0).max(1),
  revealed: z.boolean(),
})
export type Discovery = z.infer<typeof discoverySchema>

export const backgroundResultsSchema = z.object({
  /** NPC Entries the Drafter named from the Passage (source `play`). */
  newEntryIds: z.array(z.string()),
  arcCheck: z.array(
    z.object({ exitConditionId: z.string(), probability: z.number().min(0).max(1), met: z.boolean() })
  ),
  /** Set when every Exit condition of the Arc was met and code advanced it. */
  arcAdvancedTo: z.number().int().nullable(),
  pacing: z.object({ probability: z.number().min(0).max(1), nudge: z.boolean(), reason: z.string().nullable() }).nullable(),
  error: z.string().nullable(),
})
export type BackgroundResults = z.infer<typeof backgroundResultsSchema>

export const turnLogSchema = z.object({
  reading: z.object({
    intent: choiceAnswer,
    /** An Entry id, `none` or `not_in_codex`, with the label shown. */
    target: choiceAnswer.extend({ label: z.string() }),
    classification: z.object({
      value: classificationSchema,
      probability: z.number().min(0).max(1),
      /** Below the confidence floor, so treated as tangential. */
      belowFloor: z.boolean(),
    }),
  }),
  outcome: outcomeSchema,
  /** The Directive given to the Writer, summarised. */
  directive: z.string(),
  rounds: z.array(roundSchema).min(1).max(3),
  discovery: z.array(discoverySchema),
  /** Null while background work is pending. */
  background: backgroundResultsSchema.nullable(),
  timings: z.object({
    totalMs: z.number(),
    readingMs: z.number(),
    resolvingMs: z.number(),
    writingMs: z.number(),
    judgingMs: z.number(),
    backgroundMs: z.number().nullable(),
  }),
  jevModelVersion: z.string(),
})
export type TurnLog = z.infer<typeof turnLogSchema>

export const backgroundStatusSchema = z.enum(["pending", "done", "failed"])
export type BackgroundStatus = z.infer<typeof backgroundStatusSchema>

export const turnSchema = z
  .object({
    id: z.string().min(1),
    sessionId: z.string().min(1),
    /** 0-based, monotonic per Session. */
    idx: z.number().int().min(0),
    playerInput: z.string(),
    passage: z.string(),
    /** Shipped after three failed Rounds. */
    flagged: z.boolean(),
    log: turnLogSchema,
    state: playerStateSchema,
    backgroundStatus: backgroundStatusSchema,
    createdAt: z.iso.datetime(),
  })
  .superRefine((turn, ctx) => {
    const shipped = turn.log.rounds.flatMap((round) => round.drafts).filter((draft) => draft.shipped)
    if (shipped.length !== 1) {
      ctx.addIssue({ code: "custom", message: "A Turn ships exactly one Draft.", path: ["log", "rounds"] })
    } else if (shipped[0].text !== turn.passage) {
      ctx.addIssue({ code: "custom", message: "The Passage must be the shipped Draft.", path: ["passage"] })
    }
    if (turn.flagged !== (turn.log.rounds.length === 3 && !shipped[0]?.passed)) {
      ctx.addIssue({
        code: "custom",
        message: "A Turn is flagged exactly when it shipped a failing Draft after three Rounds.",
        path: ["flagged"],
      })
    }
    if ((turn.backgroundStatus === "pending") !== (turn.log.background === null)) {
      ctx.addIssue({
        code: "custom",
        message: "Background results are null exactly while background work is pending.",
        path: ["log", "background"],
      })
    }
  })
export type Turn = z.infer<typeof turnSchema>

