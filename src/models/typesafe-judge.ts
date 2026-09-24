/**
 * The real Judge: Jev through the TypeSafe SDK (`@typesafe-ai/sdk`).
 *
 * The SDK reads `TYPESAFE_API_KEY`, `TYPESAFE_BASE_URL` and
 * `TYPESAFE_DEFAULT_MODEL` itself (https://docs.typesafe.ai/sdk/javascript),
 * so `new TypeSafeJudge()` needs no configuration. Server-only: the key must
 * never reach a browser.
 *
 * Every call logs the versioned model id Jev reports, because an alias such
 * as `jev-latest` can move under us (https://docs.typesafe.ai/models#aliases).
 */
import { TypeSafeClient, type TypeSafeClientConfig } from "@typesafe-ai/sdk"

import {
  assertValidQuestions,
  checkAnswers,
  type Judge,
  type JudgeQuestions,
  type JudgeRequest,
  type JudgeResult,
} from "./judge"

/** Aliases resolve to a versioned id, so a different reported id is expected. */
const ALIASES = new Set(["jev-latest", "jev-preview"])

export interface JudgeLogger {
  info(message: string): void
  warn(message: string): void
  error(message: string): void
}

export interface TypeSafeJudgeOptions {
  /**
   * Model to request. Defaults to the client's default model, which is
   * `TYPESAFE_DEFAULT_MODEL` (pinned to `jev-1.13.0` in spec §15).
   */
  model?: string
  /**
   * Retries after the first attempt, for 408, 429, 5xx and connection
   * failures. Default 1: spec §13 retries a critical-path failure once.
   */
  maxRetries?: number
  /** Timeout per attempt in milliseconds. SDK default: 10 000. */
  timeoutMs?: number
  logger?: JudgeLogger
  /** Passed to the SDK client; tests use it to inject `fetch` and `apiKey`. */
  client?: TypeSafeClientConfig
}

export class TypeSafeJudge implements Judge {
  readonly model: string
  readonly #client: TypeSafeClient
  readonly #logger: JudgeLogger

  constructor(options: TypeSafeJudgeOptions = {}) {
    this.#client = new TypeSafeClient({
      ...options.client,
      retry: { ...options.client?.retry, maxRetries: options.maxRetries ?? 1 },
      ...(options.timeoutMs === undefined
        ? {}
        : { timeout: options.timeoutMs }),
    })
    this.model = options.model ?? this.#client.defaultModel
    this.#logger = options.logger ?? consoleLogger
  }

  async ask<const Q extends JudgeQuestions>(
    request: JudgeRequest<Q>,
    options: { signal?: AbortSignal } = {}
  ): Promise<JudgeResult<Q>> {
    assertValidQuestions(request.questions)
    const count = Object.keys(request.questions).length
    const started = performance.now()
    let result
    try {
      result = await this.#client.systemOne(
        {
          state: request.state,
          questions: request.questions,
          model: this.model,
        },
        { signal: options.signal }
      )
    } catch (error) {
      const latencyMs = Math.round(performance.now() - started)
      this.#logger.error(
        `[judge] ${this.model} failed: questions=${count} latency_ms=${latencyMs} ${String(error)}`
      )
      throw error
    }
    const latencyMs = Math.round(performance.now() - started)

    this.#logger.info(
      `[judge] model=${result.model} requested=${this.model} questions=${count} ` +
        `input_tokens=${result.usage.input_tokens} latency_ms=${latencyMs}`
    )
    if (result.model !== this.model && !ALIASES.has(this.model)) {
      this.#logger.warn(
        `[judge] pinned ${this.model} but Jev answered as ${result.model}`
      )
    }

    return {
      answers: checkAnswers(request.questions, result.answers),
      model: result.model,
      usage: {
        inputTokens: result.usage.input_tokens,
        outputTokens: result.usage.output_tokens,
      },
      latencyMs,
    }
  }
}

const consoleLogger: JudgeLogger = {
  info: (message) => console.info(message),
  warn: (message) => console.warn(message),
  error: (message) => console.error(message),
}
