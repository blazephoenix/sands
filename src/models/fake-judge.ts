/**
 * A Judge for tests: no network, deterministic answers, and the same request
 * and answer checks as the real one.
 *
 * By default every Noul answers 0.05 (a clear no, so every Rule passes) and
 * every Choice picks its first option with probability 1. Override answers by
 * question id, or compute them from the question and state.
 *
 *   const judge = new FakeJudge({ answers: { agency_0: 0.82, intent: "arrest" } })
 */
import {
  assertValidQuestions,
  checkAnswers,
  JudgeError,
  type Judge,
  type JudgeAnswer,
  type JudgeQuestion,
  type JudgeQuestions,
  type JudgeRequest,
  type JudgeResult,
  type JudgeText,
} from "./judge"

/** A Noul probability, a Choice option, or a full answer. */
export type FakeAnswer = number | string | JudgeAnswer

export type FakeAnswerer = (
  id: string,
  question: JudgeQuestion,
  state: JudgeText
) => FakeAnswer | undefined

export interface FakeJudgeOptions {
  /** Answers by question id. Ids not asked in a call are ignored. */
  answers?: Readonly<Record<string, FakeAnswer>>
  /** Consulted for ids that `answers` does not cover. */
  answer?: FakeAnswerer
  /** The model id the fake reports. */
  model?: string
  /** Default probability for an unanswered Noul. */
  defaultNoul?: number
}

export interface FakeJudgeCall {
  readonly request: JudgeRequest<JudgeQuestions>
  readonly result: JudgeResult<JudgeQuestions>
}

export class FakeJudge implements Judge {
  readonly model: string
  /** Every successful call, oldest first. */
  readonly calls: FakeJudgeCall[] = []
  readonly #options: FakeJudgeOptions

  constructor(options: FakeJudgeOptions = {}) {
    this.#options = options
    this.model = options.model ?? "fake-judge"
  }

  async ask<const Q extends JudgeQuestions>(
    request: JudgeRequest<Q>,
    options: { signal?: AbortSignal } = {}
  ): Promise<JudgeResult<Q>> {
    options.signal?.throwIfAborted()
    assertValidQuestions(request.questions)
    const raw: Record<string, JudgeAnswer> = {}
    for (const [id, question] of Object.entries(request.questions)) {
      const given =
        this.#options.answers?.[id] ??
        this.#options.answer?.(id, question, request.state)
      raw[id] = toAnswer(id, question, given, this.#options.defaultNoul ?? 0.05)
    }
    const result: JudgeResult<Q> = {
      answers: checkAnswers(request.questions, raw),
      model: this.model,
      usage: { inputTokens: 0, outputTokens: 0 },
      latencyMs: 0,
    }
    this.calls.push({ request, result })
    return result
  }
}

function toAnswer(
  id: string,
  question: JudgeQuestion,
  given: FakeAnswer | undefined,
  defaultNoul: number
): JudgeAnswer {
  if (typeof given === "object") return given
  if (question.type === "noul") {
    if (typeof given === "string") {
      throw new JudgeError(`Fake answer for Noul "${id}" must be a number.`)
    }
    return { type: "noul", noul: given ?? defaultNoul }
  }
  if (typeof given === "number") {
    throw new JudgeError(`Fake answer for Choice "${id}" must be an option.`)
  }
  const options = Object.keys(question.criteria)
  const picked = given ?? options[0]
  return {
    type: "choice",
    choice: picked,
    probabilities: Object.fromEntries(
      options.map((option) => [option, option === picked ? 1 : 0])
    ),
    confidence: 1,
  }
}
