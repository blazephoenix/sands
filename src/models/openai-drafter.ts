/**
 * The real Drafter: an OpenAI model through the AI SDK's structured output,
 * `generateText({ output: Output.object({ schema }) })`
 * (docs/research/2026-09-24-engine-libraries.md §4; `generateObject` is
 * deprecated in AI SDK 7).
 *
 * The model is `DRAFTER_MODEL` through `@ai-sdk/openai`, which reads
 * `OPENAI_API_KEY` itself. Server-only: the key must never reach a browser.
 *
 * Every call logs the model id the provider reports (`response.modelId`),
 * the way the Judge logs Jev's version.
 */
import { openai } from "@ai-sdk/openai"
import { generateText, Output, type LanguageModel } from "ai"

import {
  assertValidCall,
  DrafterError,
  type Drafter,
  type DrafterRequest,
  type DrafterResult,
} from "./drafter"
import type { JudgeLogger } from "./typesafe-judge"

type Reasoning = Parameters<typeof generateText>[0]["reasoning"]

export interface OpenAIDrafterOptions {
  /** Defaults to `openai(DRAFTER_MODEL)`. Tests pass a mock model. */
  model?: LanguageModel
  /**
   * How much the model reasons before answering. Default `low`: at the
   * provider's default (`medium`) a tiny call took 4.6 s, and setup's calls
   * are far larger (research §3).
   */
  reasoning?: Reasoning
  /** Retries after the first attempt. Default 1, as spec §13 retries a model failure once. */
  maxRetries?: number
  /** Timeout per call in milliseconds. Default 180 000: setup's calls take tens of seconds. */
  timeoutMs?: number
  logger?: JudgeLogger
}

export class OpenAIDrafter implements Drafter {
  readonly #model: LanguageModel
  readonly #options: OpenAIDrafterOptions
  readonly #logger: JudgeLogger

  constructor(options: OpenAIDrafterOptions = {}) {
    this.#options = options
    this.#logger = options.logger ?? consoleLogger
    if (options.model) {
      this.#model = options.model
    } else {
      // Checked here, not at the first call: the provider reads the key
      // lazily, and a run should not start that cannot finish.
      const id = process.env.DRAFTER_MODEL
      for (const [name, value] of [
        ["DRAFTER_MODEL", id],
        ["OPENAI_API_KEY", process.env.OPENAI_API_KEY],
      ]) {
        if (!value) {
          throw new DrafterError(
            `${name} is not set on the server. Add it to .env.local (see .env.example) and restart.`
          )
        }
      }
      this.#model = openai(id!)
    }
  }

  get requestedModel() {
    return typeof this.#model === "string" ? this.#model : this.#model.modelId
  }

  async draft<Output>(
    request: DrafterRequest<Output>,
    options: { signal?: AbortSignal } = {}
  ): Promise<DrafterResult<Output>> {
    assertValidCall(request.call)
    const started = performance.now()
    let result
    try {
      result = await generateText({
        model: this.#model,
        instructions: request.instructions,
        prompt: request.prompt,
        output: Output.object({ schema: request.schema, name: request.call }),
        reasoning: this.#options.reasoning ?? "low",
        maxRetries: this.#options.maxRetries ?? 1,
        timeout: this.#options.timeoutMs ?? 180_000,
        abortSignal: options.signal,
      })
    } catch (error) {
      const latencyMs = Math.round(performance.now() - started)
      this.#logger.error(
        `[drafter] call=${request.call} ${this.requestedModel} failed: latency_ms=${latencyMs} ${String(error)}`
      )
      throw error
    }
    const latencyMs = Math.round(performance.now() - started)
    const usage = {
      inputTokens: result.usage.inputTokens ?? 0,
      outputTokens: result.usage.outputTokens ?? 0,
      reasoningTokens: result.usage.outputTokenDetails.reasoningTokens ?? 0,
    }
    this.#logger.info(
      `[drafter] call=${request.call} model=${result.response.modelId} requested=${this.requestedModel} ` +
        `input_tokens=${usage.inputTokens} output_tokens=${usage.outputTokens} ` +
        `reasoning_tokens=${usage.reasoningTokens} latency_ms=${latencyMs}`
    )
    return {
      output: result.output as Output,
      model: result.response.modelId,
      usage,
      latencyMs,
    }
  }
}

const consoleLogger: JudgeLogger = {
  info: (message) => console.info(message),
  warn: (message) => console.warn(message),
  error: (message) => console.error(message),
}
