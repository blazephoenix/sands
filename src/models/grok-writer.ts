/**
 * The real Writer: Grok through the AI SDK's xAI provider
 * (docs/research/2026-09-24-engine-libraries.md §4). `xai(id)` uses the
 * Responses API and reads `XAI_API_KEY` itself; the model is `WRITER_MODEL`,
 * a reasoning Grok, so it thinks through the characters before it drafts
 * (#18). It asks for a reasoning summary, which the harness pane shows under
 * each Draft; xAI documents readable summaries for `grok-4.7` only, and other
 * reasoning models return their reasoning encrypted. Server-only: the key must
 * never reach a browser.
 *
 * Every call logs the model id the provider reports (`response.modelId`),
 * the way the Judge logs Jev's version. A failed call is retried once (spec
 * §13): the SDK retries transport failures, and an empty Draft is asked for
 * once more here. A second failure fails the Turn.
 */
import { xai, type XaiLanguageModelResponsesOptions } from "@ai-sdk/xai"
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
  /**
   * Timeout per call in milliseconds. Default 60 000: a reasoning Draft takes
   * longer than the ~3 s a non-reasoning one did.
   */
  timeoutMs?: number
  logger?: ModelLogger
  /** The output-token ceiling, reasoning included. The engine passes its config. */
  maxOutputTokens: number
  /** Reasoning effort. Default "provider-default"; the engine passes its config. */
  reasoning?: "provider-default" | "low" | "medium" | "high"
}

export class GrokWriter implements Writer {
  readonly #model: LanguageModel
  readonly #options: GrokWriterOptions
  readonly #logger: ModelLogger

  constructor(options: GrokWriterOptions) {
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
        maxOutputTokens: this.#options.maxOutputTokens,
        reasoning: this.#options.reasoning ?? "provider-default",
        maxRetries: this.#options.maxRetries ?? 1,
        timeout: this.#options.timeoutMs ?? 60_000,
        abortSignal: options.signal,
        providerOptions: {
          xai: {
            reasoningSummary: "auto",
          } satisfies XaiLanguageModelResponsesOptions,
        },
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
        `input_tokens=${usage.inputTokens} output_tokens=${usage.outputTokens} ` +
        `reasoning_tokens=${result.usage.outputTokenDetails.reasoningTokens ?? 0} latency_ms=${latencyMs}`
    )
    return {
      text: result.text.trim(),
      model: result.response.modelId,
      usage,
      latencyMs,
      reasoning: result.finalStep.reasoningText?.trim() || null,
    }
  }
}
