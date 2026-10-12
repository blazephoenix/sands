/**
 * NDJSON progress events for the long-running routes.
 * One JSON object per line. Every stream ends with exactly one `result` or
 * one `error` event. No prose is ever streamed.
 *
 * - `POST /api/worlds/[id]/setup` streams `SetupEvent`s (spec §8).
 * - `POST /api/sessions/[id]/turn` streams `TurnEvent`s (spec §9).
 *
 * `at` is milliseconds since the stream started, for elapsed-time displays.
 */
import { z } from "zod"

import { entrySchema } from "./entry"
import { sessionSchema, turnSchema } from "./session"
import { solvabilityGapSchema, worldSchema } from "./world"

/** Stable error codes a stream can end with. */
export const streamErrorCodeSchema = z.enum([
  "drafter_error",
  "judge_outage",
  "writer_error",
  "solvability_failed",
  "invalid_brief",
  "not_found",
  "conflict",
  "internal",
])
export type StreamErrorCode = z.infer<typeof streamErrorCodeSchema>

const streamError = z.object({
  type: z.literal("error"),
  code: streamErrorCodeSchema,
  /** The cause and the next step, in plain words. */
  message: z.string(),
  at: z.number(),
})

// Setup (spec §8): parse -> World call -> Story logic call -> validate -> solvability,
// with up to two Story logic retries when solvability fails.

export const SETUP_STEPS = [
  "parse",
  "world_call",
  "story_logic_call",
  "validate",
  "solvability",
] as const
export const setupStepSchema = z.enum(SETUP_STEPS)
export type SetupStep = z.infer<typeof setupStepSchema>

export const SETUP_STEP_LABELS: Record<SetupStep, string> = {
  parse: "Reading the Brief",
  world_call: "World call",
  story_logic_call: "Story logic call",
  validate: "Judge validation",
  solvability: "Solvability check",
}

export const setupEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("step"),
    step: setupStepSchema,
    status: z.enum(["started", "done", "failed"]),
    /** Story logic call and solvability repeat: attempt 1 of 3 at most. */
    attempt: z.number().int().min(1),
    maxAttempts: z.number().int().min(1),
    /** A short line for the stepper, e.g. "fixing 2 gaps". */
    detail: z.string().nullable(),
    at: z.number(),
  }),
  /** Solvability failed; the Story logic call will retry with these gaps as feedback (or setup ends if none are left). */
  z.object({
    type: z.literal("gaps"),
    attempt: z.number().int().min(1),
    gaps: z.array(solvabilityGapSchema),
    at: z.number(),
  }),
  z.object({
    type: z.literal("result"),
    world: worldSchema,
    entries: z.array(entrySchema),
    at: z.number(),
  }),
  streamError.extend({
    /** For `solvability_failed`: the exact gaps left after the last attempt. */
    gaps: z.array(solvabilityGapSchema).optional(),
    step: setupStepSchema.optional(),
  }),
])
export type SetupEvent = z.infer<typeof setupEventSchema>

// Turn (spec §9.1). Only the steps whose result the Player reads block the Passage.

export const TURN_PHASES = [
  "waiting_background",
  "reading",
  "resolving",
  "writing",
  "judging",
] as const
export const turnPhaseSchema = z.enum(TURN_PHASES)
export type TurnPhase = z.infer<typeof turnPhaseSchema>

export const turnEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("phase"),
    phase: turnPhaseSchema,
    /** Writing and judging happen once per Round (1 to 3). */
    round: z.number().int().min(1).max(3).nullable(),
    at: z.number(),
  }),
  z.object({
    type: z.literal("result"),
    turn: turnSchema,
    session: sessionSchema,
    /** Entries that changed with this Turn (usually none until background work lands). */
    entries: z.array(entrySchema),
    at: z.number(),
  }),
  streamError,
])
export type TurnEvent = z.infer<typeof turnEventSchema>
