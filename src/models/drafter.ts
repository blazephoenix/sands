/**
 * The Drafter (spec §5.1, §8 step 2): the model that proposes setup Entries,
 * and later names new characters found in Passages (ADR-0009).
 *
 * One `draft` is one structured-output call: instructions, a prompt and a
 * zod schema, answered with an object that fits the schema. The caller owns
 * the prompt and the schema; the Drafter only runs the call. So setup's two
 * calls (the World call and the Story logic call) and any later call share
 * one interface, and a test can read the exact prompt a call was given.
 *
 * Schemas must suit OpenAI's strict structured outputs: every field
 * required, `.nullable()` instead of `.optional()`
 * (docs/research/2026-09-24-engine-libraries.md §4).
 */
import type { z } from "zod"

export interface DrafterRequest<Output> {
  /**
   * Names the call in logs and in the schema sent to the model, and lets a
   * fake script its answer: `world_call`, `story_logic_call`. Letters,
   * digits, `_` and `-` only.
   */
  readonly call: string
  /** The system instructions. */
  readonly instructions: string
  readonly prompt: string
  readonly schema: z.ZodType<Output>
}

export interface DrafterResult<Output> {
  readonly output: Output
  /** The model id that served the call, as the provider reported it. */
  readonly model: string
  readonly usage: {
    readonly inputTokens: number
    readonly outputTokens: number
    readonly reasoningTokens: number
  }
  /** Wall-clock time of the call, including any retries. */
  readonly latencyMs: number
}

export interface Drafter {
  draft<Output>(
    request: DrafterRequest<Output>,
    options?: { signal?: AbortSignal }
  ): Promise<DrafterResult<Output>>
}

/** A Drafter call that could not be made, or whose answer does not fit its schema. */
export class DrafterError extends Error {
  override readonly name = "DrafterError"
}

/** Call names become schema names, which OpenAI limits to these characters. */
export function assertValidCall(call: string): void {
  if (!/^[A-Za-z0-9_-]{1,64}$/u.test(call)) {
    throw new DrafterError(
      `Drafter call name "${call}" must be 1-64 letters, digits, "_" or "-".`
    )
  }
}
