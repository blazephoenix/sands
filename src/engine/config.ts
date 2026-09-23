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
  offScriptPenalty: -10,
  wrongTargetPenalty: -15,
  prematurePenalty: -20,
  recovery: 5,
  offScriptThreshold: 4,
  offScriptWarningsAt: [2, 3] as const,
  deathOddsPerArc: [0.2, 0.35, 0.5] as const,
  pacingWindow: 3,
  writerRecentPassages: 4,
  draftsPerRound: 2,
  maxRounds: 3,
  /** A Rule fails at p >= 0.5 and is flagged (uncertain) for 0.35 <= p < 0.65. */
  ruleFailAt: 0.5,
  ruleFlaggedBand: [0.35, 0.65] as const,
  choiceConfidenceFloor: 0.6,
  passageWords: 150,
} as const

export function bandFor(reputation: number): Band {
  if (reputation >= ENGINE_CONFIG.bands.high) return "high"
  if (reputation >= ENGINE_CONFIG.bands.normal) return "normal"
  return "low"
}

export function ruleVerdict(probability: number) {
  const [low, high] = ENGINE_CONFIG.ruleFlaggedBand
  return {
    failed: probability >= ENGINE_CONFIG.ruleFailAt,
    flagged: probability >= low && probability < high,
  }
}
