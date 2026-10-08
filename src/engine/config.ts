/**
 * Harness defaults (spec §15). Pure data, read by the engine and by the UI
 * (Reputation meter, off-script threshold, Rule verdicts).
 */
import type { Band } from "@/domain/entry"

export const ENGINE_CONFIG = {
  startingReputation: 60,
  reputationRange: [0, 100] as const,
  /** high >= 70, normal 30-69, low < 30. */
  bands: { high: 70, normal: 30 },
  /** Every penalty is a positive number subtracted from Reputation. */
  offScriptPenalty: 10,
  /** Defaults for a Decisive action; each action carries its own. */
  wrongTargetPenalty: 15,
  prematurePenalty: 20,
  recovery: 5,
  offScriptThreshold: 4,
  offScriptWarningsAt: [2, 3] as const,
  deathOddsPerArc: [0.2, 0.35, 0.5] as const,
  pacingWindow: 2,
  /** The Arc check counts an Exit condition met at p >= 0.5. */
  exitConditionMetAt: 0.5,
  /** The pacing check counts progress at p >= 0.5; below it, the Pacing nudge is set. */
  pacingProgressAt: 0.5,
  writerRecentPassages: 4,
  draftsPerRound: 2,
  maxRounds: 3,
  /** A Rule fails at p >= 0.5 and is Unsure for 0.35 <= p < 0.65. Ours, not Jev's. */
  ruleFailAt: 0.5,
  ruleUnsureBand: [0.35, 0.65] as const,
  /** Only a Rule failure at p >= 0.8 becomes a line of Retry feedback (spec §10.4). */
  retryFeedbackFloor: 0.8,
  choiceConfidenceFloor: 0.6,
  /** The Passage cap the Writer is told: "Keep each Passage under {words} words." */
  passageWords: 300,
  /**
   * The Writer's output-token ceiling. A reasoning Writer's thinking counts
   * against it, so it leaves room for the reasoning as well as a Passage of
   * `passageWords`; a runaway Draft is still cut, not waited for.
   */
  writerMaxOutputTokens: 6000,
  /**
   * How hard the Writer reasons. grok-4.7 defaults to "high", which ran past
   * the 60 s timeout on both Drafts of a Round; "low" still runs the
   * "before writing" checklist.
   */
  writerReasoning: "low",
} as const

export function bandFor(reputation: number): Band {
  if (reputation >= ENGINE_CONFIG.bands.high) return "high"
  if (reputation >= ENGINE_CONFIG.bands.normal) return "normal"
  return "low"
}

/** Reputation kept within its range. */
export function clampReputation(value: number) {
  const [low, high] = ENGINE_CONFIG.reputationRange
  return Math.min(high, Math.max(low, value))
}

export function ruleVerdict(probability: number) {
  const [low, high] = ENGINE_CONFIG.ruleUnsureBand
  return {
    failed: probability >= ENGINE_CONFIG.ruleFailAt,
    unsure: probability >= low && probability < high,
  }
}
