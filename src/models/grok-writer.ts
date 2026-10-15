/**
 * The real Writer: Grok through the AI SDK's xAI provider
 * (docs/research/2026-09-24-engine-libraries.md §4), answering with
 * structured output. `xai(id)` uses the Responses API and reads
 * `XAI_API_KEY` itself; the model is `WRITER_MODEL`. Server-only: the key
 * must never reach a browser.
 *
 * Every call logs the model id the provider reports. The SDK retries
 * transport failures once; a reply that is not the schema, or has an empty
 * Passage, is asked for once more here. A second failure fails the Turn.
 */
import { xai } from "@ai-sdk/xai"
import {
  generateText,
  NoObjectGeneratedError,
  Output,
  type LanguageModel,
} from "ai"

import { consoleLogger, type ModelLogger } from "./logger"
import {
  WriterError,
  writerOutputSchema,
  type Writer,
  type WriterRequest,
  type WriterResult,
} from "./writer"

export interface GrokWriterOptions {
  /** Defaults to `xai(WRITER_MODEL)`. Tests pass a mock model. */
  model?: LanguageModel
  /** Transport retries after the first attempt. Default 1. */
  maxRetries?: number
  /** Timeout per call in milliseconds. Default 60 000. */
  timeoutMs?: number
  logger?: ModelLogger
}

/** Room for a long Passage, its choices and an Epilogue; a runaway reply is cut, not waited for. */
const MAX_OUTPUT_TOKENS = 2_000

export class GrokWriter implements Writer {
  readonly #model: LanguageModel
  readonly #options: GrokWriterOptions
  readonly #logger: ModelLogger

  constructor(options: GrokWriterOptions = {}) {
    this.#options = options
    this.#logger = options.logger ?? consoleLogger
    if (options.model) {
      this.#model = options.model
    } else {
      // Checked here, not at the first call: the provider reads the key lazily.
      const id = process.env.WRITER_MODEL
      for (const [name, value] of [
        ["WRITER_MODEL", id],
        ["XAI_API_KEY", process.env.XAI_API_KEY],
      ]) {
        if (!value) {
          throw new WriterError(
            `${name} is not set on the server. Add it to .env.local (see .env.example) and restart.`
          )
        }
      }
      this.#model = xai(id!)
    }
  }

  get requestedModel() {
    return typeof this.#model === "string" ? this.#model : this.#model.modelId
  }

  async write(
    request: WriterRequest,
    options: { signal?: AbortSignal } = {}
  ): Promise<WriterResult> {
    try {
      return await this.#call(request, options)
    } catch (error) {
      if (!isUnusableReply(error)) throw error
      this.#logger.warn(
        `[writer] ${this.requestedModel} sent an unusable reply (${error.message}); asking once more`
      )
    }
    try {
      return await this.#call(request, options)
    } catch (error) {
      if (!isUnusableReply(error)) throw error
      throw new WriterError(
        `The Writer sent an unusable reply twice: ${error.message}`
      )
    }
  }

  async #call(
    request: WriterRequest,
    options: { signal?: AbortSignal }
  ): Promise<WriterResult> {
    const started = performance.now()
    const latency = () => Math.round(performance.now() - started)
    let result
    try {
      result = await generateText({
        model: this.#model,
        instructions: request.instructions,
        prompt: request.prompt,
        output: Output.object({ schema: writerOutputSchema }),
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        maxRetries: this.#options.maxRetries ?? 1,
        timeout: this.#options.timeoutMs ?? 60_000,
        abortSignal: options.signal,
      })
    } catch (error) {
      this.#logger.error(
        `[writer] ${this.requestedModel} failed: latency_ms=${latency()} ${String(error)}`
      )
      if (NoObjectGeneratedError.isInstance(error))
        throw new UnusableReply("not the expected structure")
      throw error
    }
    const latencyMs = latency()
    const usage = {
      inputTokens: result.usage.inputTokens ?? 0,
      outputTokens: result.usage.outputTokens ?? 0,
    }
    this.#logger.info(
      `[writer] model=${result.response.modelId} requested=${this.requestedModel} ` +
        `input_tokens=${usage.inputTokens} output_tokens=${usage.outputTokens} latency_ms=${latencyMs}`
    )
    const output = result.output
    if (!output.passage.trim()) throw new UnusableReply("an empty Passage")
    return {
      output,
      rawOutput: result.text,
      model: result.response.modelId,
      usage,
      latencyMs,
    }
  }
}

class UnusableReply extends Error {
  override readonly name = "UnusableReply"
}

function isUnusableReply(error: unknown): error is UnusableReply {
  return error instanceof UnusableReply
}
