/**
 * Sessions and Turns (CONTEXT.md; spec §6 `sessions`, `turns`, Player state;
 * §9 for what a Turn log records).
 *
 * A Turn row is written only when a Passage ships. It holds the full Player
 * state after the Turn and the Turn's log. Background work (naming new
 * characters, Exit conditions, pacing) is merged into the latest Turn when it
 * finishes.
 *
 * Turn 0 is always the Opening (spec §9.0): the Writer sets the first scene
 * before the Player acts, so it has no Player input, no reading and no
 * Outcome. Every later Turn has all three.
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

export const classificationSchema = z.enum([
  "on_script",
  "tangential",
  "off_script",
  "reckless",
])
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
  /** 0.35 <= p < 0.65: too close to call either way (CONTEXT.md: Unsure). */
  unsure: z.boolean(),
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

const choiceAnswer = z.object({
  value: z.string(),
  probability: z.number().min(0).max(1),
})

/** What the Player's intent achieved (spec §9.1 step 3). */
export const ACTION_RESULTS = [
  "moved",
  "move_refused",
  "examined",
  "questioned",
  "decisive_success",
  "decisive_premature",
  "decisive_wrong_target",
  "narrated",
] as const
export const actionResultSchema = z.enum(ACTION_RESULTS)
export type ActionResult = z.infer<typeof actionResultSchema>

/** The Classification's effect: an off-script penalty, a reckless death roll, or nothing. */
export const PENALTY_KINDS = ["none", "off_script", "reckless"] as const
export const penaltyKindSchema = z.enum(PENALTY_KINDS)
export type PenaltyKind = z.infer<typeof penaltyKindSchema>

/**
 * What code decided a Player's action achieved, before any prose is written.
 * The action's result and the Classification's penalty are recorded apart:
 * a Classification never cancels the intent (an off-script move still
 * moves the Player, then costs Reputation).
 */
export const outcomeSchema = z.object({
  /** The intent's result. Null when a lethal death roll ended the Session before it resolved. */
  action: z
    .object({
      kind: actionResultSchema,
      /** What code decided, in a sentence. */
      summary: z.string(),
      /** Negative for a failed Decisive action's penalty; otherwise 0. */
      reputationDelta: z.number().max(0),
    })
    .nullable(),
  penalty: z.object({
    kind: penaltyKindSchema,
    summary: z.string(),
    reputationDelta: z.number().max(0),
    offScriptDelta: z.number().int().min(0),
    /** Present for reckless actions: the seeded death roll. Lethal when `roll < odds`. */
    deathRoll: z
      .object({ odds: z.number(), roll: z.number(), lethal: z.boolean() })
      .nullable(),
  }),
  ending: endingSchema,
  /** Why the Session ended this Turn, in a sentence; null when it did not. */
  endingReason: z.string().nullable(),
})
export type Outcome = z.infer<typeof outcomeSchema>

export const discoverySchema = z.object({
  target: z.object({
    kind: z.enum(["clue", "knowledge"]),
    entryId: z.string(),
  }),
  question: z.string(),
  probability: z.number().min(0).max(1),
  revealed: z.boolean(),
  /** Recovery: + when a revealed Clue is one a Decisive action requires. */
  reputationDelta: z.number().min(0),
})
export type Discovery = z.infer<typeof discoverySchema>

export const backgroundResultsSchema = z.object({
  /** NPC Entries the Drafter named from the Passage (source `play`). */
  newEntryIds: z.array(z.string()),
  arcCheck: z.array(
    z.object({
      exitConditionId: z.string(),
      probability: z.number().min(0).max(1),
      met: z.boolean(),
    })
  ),
  /** Set when every Exit condition of the Arc was met and code advanced it. */
  arcAdvancedTo: z.number().int().nullable(),
  pacing: z
    .object({
      probability: z.number().min(0).max(1),
      nudge: z.boolean(),
      reason: z.string().nullable(),
    })
    .nullable(),
  error: z.string().nullable(),
})
export type BackgroundResults = z.infer<typeof backgroundResultsSchema>

export const turnLogSchema = z.object({
  /** What the Judge read from the Player's input. Null for the Opening: there is no input. */
  reading: z
    .object({
      intent: choiceAnswer,
      /** An Entry id, `none` or `not_in_codex`, with the label shown. */
      target: choiceAnswer.extend({ label: z.string() }),
      classification: z.object({
        value: classificationSchema,
        probability: z.number().min(0).max(1),
        /** Below the confidence floor, so treated as tangential. */
        belowFloor: z.boolean(),
      }),
    })
    .nullable(),
  /** What code decided. Null for the Opening: no Outcome is resolved. */
  outcome: outcomeSchema.nullable(),
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
    /** 0-based, monotonic per Session. 0 is the Opening. */
    idx: z.number().int().min(0),
    /** Null exactly for the Opening (turn 0). */
    playerInput: z.string().nullable(),
    passage: z.string(),
    /** Shipped after three failed Rounds. */
    flagged: z.boolean(),
    log: turnLogSchema,
    state: playerStateSchema,
    backgroundStatus: backgroundStatusSchema,
    createdAt: z.iso.datetime(),
  })
  .superRefine((turn, ctx) => {
    for (const message of openingRuleIssues(turn)) {
      ctx.addIssue({ code: "custom", message, path: ["playerInput"] })
    }
    const shipped = turn.log.rounds
      .flatMap((round) => round.drafts)
      .filter((draft) => draft.shipped)
    if (shipped.length !== 1) {
      ctx.addIssue({
        code: "custom",
        message: "A Turn ships exactly one Draft.",
        path: ["log", "rounds"],
      })
    } else if (shipped[0].text !== turn.passage) {
      ctx.addIssue({
        code: "custom",
        message: "The Passage must be the shipped Draft.",
        path: ["passage"],
      })
    }
    if (
      turn.flagged !== (turn.log.rounds.length === 3 && !shipped[0]?.passed)
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "A Turn is flagged exactly when it shipped a failing Draft after three Rounds.",
        path: ["flagged"],
      })
    }
    if (
      (turn.backgroundStatus === "pending") !==
      (turn.log.background === null)
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "Background results are null exactly while background work is pending.",
        path: ["log", "background"],
      })
    }
  })
export type Turn = z.infer<typeof turnSchema>

/** The Opening is always Turn 0 (spec §9.0). */
export const OPENING_IDX = 0

/** Is this Turn the Session's Opening? */
export function isOpening(turn: Pick<Turn, "idx">) {
  return turn.idx === OPENING_IDX
}

/**
 * The Opening rule: Turn 0 has no Player input, no reading and no Outcome;
 * every later Turn has all three. Returns what is wrong, or nothing.
 */
export function openingRuleIssues(turn: {
  idx: number
  playerInput: string | null
  log: Pick<TurnLog, "reading" | "outcome">
}): string[] {
  const issues: string[] = []
  if (turn.idx === OPENING_IDX) {
    if (turn.playerInput !== null)
      issues.push("Turn 0 is the Opening: it has no Player input.")
    if (turn.log.reading !== null || turn.log.outcome !== null)
      issues.push("The Opening reads no input and resolves no Outcome.")
  } else {
    if (turn.playerInput === null)
      issues.push("Only the Opening (Turn 0) may have no Player input.")
    if (turn.log.reading === null || turn.log.outcome === null)
      issues.push(
        "A Turn after the Opening reads its input and resolves an Outcome."
      )
  }
  return issues
}

/** How a Turn is named in the story and the harness log: "Opening", then "Turn 1", "Turn 2"… */
export function turnLabel(turn: Pick<Turn, "idx">) {
  return isOpening(turn) ? "Opening" : `Turn ${turn.idx}`
}

/** Turns the Player has played, from a count of a Session's Turns: every Turn but the Opening. */
export function playerTurnCount(turnCount: number) {
  return Math.max(0, turnCount - 1)
}
