/**
 * The real Writer: Grok through the AI SDK's xAI provider
 * (docs/research/2026-09-24-engine-libraries.md §4). `xai(id)` uses the
 * Responses API and reads `XAI_API_KEY` itself; the model is `WRITER_MODEL`,
 * a fast non-reasoning Grok. Server-only: the key must never reach a browser.
 *
 * Every call logs the model id the provider reports (`response.modelId`),
 * the way the Judge logs Jev's version. A failed call is retried once (spec
 * §13): the SDK retries transport failures, and an empty Draft is asked for
 * once more here. A second failure fails the Turn.
 */
import { xai } from "@ai-sdk/xai"
import { generateText, type LanguageModel } from "ai"

import { consoleLogger, type ModelLogger } from "./logger"
import {
  WriterError,
  type Writer,
  type WriterRequest,
  type WriterResult,
} from "./writer"

export interface GrokWriterOptions {
  /** Defaults to `xai(WRITER_MODEL)`. Tests pass a mock model. */
  model?: LanguageModel
  /** Retries after the first attempt. Default 1 (spec §13). */
  maxRetries?: number
  /** Timeout per call in milliseconds. Default 30 000; a Draft takes about 3 s. */
  timeoutMs?: number
  logger?: ModelLogger
}

/** Room for a ~150-word Passage and then some; a runaway Draft is cut, not waited for. */
const MAX_OUTPUT_TOKENS = 600

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
    const first = await this.#call(request, options)
    if (first.text) return first
    this.#logger.warn(
      `[writer] ${this.requestedModel} returned an empty Draft; asking once more`
    )
    const second = await this.#call(request, options)
    if (second.text) return second
    throw new WriterError("The Writer returned an empty Draft twice.")
  }

  async #call(
    request: WriterRequest,
    options: { signal?: AbortSignal }
  ): Promise<WriterResult> {
    const started = performance.now()
    let result
    try {
      result = await generateText({
        model: this.#model,
        instructions: request.instructions,
        prompt: request.prompt,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        maxRetries: this.#options.maxRetries ?? 1,
        timeout: this.#options.timeoutMs ?? 30_000,
        abortSignal: options.signal,
      })
    } catch (error) {
      const latencyMs = Math.round(performance.now() - started)
      this.#logger.error(
        `[writer] ${this.requestedModel} failed: latency_ms=${latencyMs} ${String(error)}`
      )
      throw error
    }
    const latencyMs = Math.round(performance.now() - started)
    const usage = {
      inputTokens: result.usage.inputTokens ?? 0,
      outputTokens: result.usage.outputTokens ?? 0,
    }
    this.#logger.info(
      `[writer] model=${result.response.modelId} requested=${this.requestedModel} ` +
        `input_tokens=${usage.inputTokens} output_tokens=${usage.outputTokens} latency_ms=${latencyMs}`
    )
    return {
      text: result.text.trim(),
      model: result.response.modelId,
      usage,
      latencyMs,
    }
  }
}
