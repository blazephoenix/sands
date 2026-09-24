/**
 * The Writer (spec §5.1, §9.1 step 5): the model that writes Drafts. One
 * `write` is one Draft; a Round asks for two in parallel. The caller owns the
 * instructions and the prompt (`engine/writer-prompt.ts`), so a test can read
 * exactly what the Writer was given.
 */
export interface WriterRequest {
  /** The system instructions. */
  readonly instructions: string
  readonly prompt: string
}

export interface WriterResult {
  readonly text: string
  /** The model id that served the call, as the provider reported it. */
  readonly model: string
  readonly usage: {
    readonly inputTokens: number
    readonly outputTokens: number
  }
  /** Wall-clock time of the call, including any retries. */
  readonly latencyMs: number
}

export interface Writer {
  write(
    request: WriterRequest,
    options?: { signal?: AbortSignal }
  ): Promise<WriterResult>
}

/** A Writer call that could not be made, or came back empty. */
export class WriterError extends Error {
  override readonly name = "WriterError"
}
