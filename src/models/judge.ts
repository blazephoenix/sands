/**
 * The Judge (spec §5.1, §10): the model that turns prose and Player input
 * into facts. Code decides what those facts mean (ADR-0001).
 *
 * One `ask` is one Jev request: one state and any number of named questions,
 * evaluated independently and in parallel, each answered under its own id
 * (https://docs.typesafe.ai/primitives#ask-multiple-questions-together). So a
 * caller batches everything that shares a state into one call: every Rule
 * question for both Drafts plus the Discovery questions (spec §9.1 step 6),
 * or the three choice questions of a Reading (spec §9.1 step 2).
 *
 * Only `noul` and `choice` are modelled; the harness asks no `score`
 * questions. The shapes mirror the HTTP API
 * (https://docs.typesafe.ai/api) so the real Judge passes them through as is.
 */

/** JSON as the Judge accepts it in state, instructions and criteria. */
export type JudgeJson =
  string | number | boolean | null | JudgeJson[] | { [key: string]: JudgeJson }

/**
 * Instructions or a criterion description: plain text, or an object that
 * holds the question in one field and the data it refers to in others
 * (https://docs.typesafe.ai/primitives/advanced).
 */
export type JudgeText = string | JudgeJson[] | { [key: string]: JudgeJson }

/** A yes/no question. The answer is the probability of yes. */
export interface NoulQuestion {
  readonly type: "noul"
  readonly instructions: JudgeText
  /** What a yes and a no mean. Optional, but the Rules always give both. */
  readonly criteria?: { readonly true?: JudgeText; readonly false?: JudgeText }
}

/** A question that picks one of a fixed set of options. */
export interface ChoiceQuestion<Option extends string = string> {
  readonly type: "choice"
  readonly instructions: JudgeText
  /** Option to description; `null` leaves an option undescribed. */
  readonly criteria: { readonly [O in Option]: JudgeText | null }
}

export type JudgeQuestion = NoulQuestion | ChoiceQuestion

/** Questions keyed by an id of the caller's choosing. Ids never reach Jev. */
export type JudgeQuestions = { readonly [id: string]: JudgeQuestion }

export interface NoulAnswer {
  readonly type: "noul"
  /** Probability of yes, 0 to 1. There is no separate confidence. */
  readonly noul: number
}

export interface ChoiceAnswer<Option extends string = string> {
  readonly type: "choice"
  /** The highest-probability option. */
  readonly choice: Option
  /** Every option's probability; they sum to 1. */
  readonly probabilities: { readonly [O in Option]: number }
  /** How peaked `probabilities` is, 0 to 1 (https://docs.typesafe.ai/confidence). */
  readonly confidence: number
}

export type JudgeAnswer = NoulAnswer | ChoiceAnswer

export type AnswerFor<Q extends JudgeQuestion> = Q extends NoulQuestion
  ? NoulAnswer
  : Q extends ChoiceQuestion<infer Option>
    ? ChoiceAnswer<Option>
    : never

export interface JudgeRequest<Q extends JudgeQuestions> {
  /**
   * What the questions are about: for a Round, the Judge state of spec §10.2.
   * Questions point into it by backticked path, e.g. `drafts[0]`. Text, an
   * object or an array (https://docs.typesafe.ai/concepts/state).
   */
  readonly state: JudgeText
  readonly questions: Q
}

export interface JudgeResult<Q extends JudgeQuestions> {
  readonly answers: { readonly [K in keyof Q]: AnswerFor<Q[K]> }
  /** The versioned model id the Judge reported for this call. */
  readonly model: string
  readonly usage: {
    readonly inputTokens: number
    readonly outputTokens: number
  }
  /** Wall-clock time of the call, including any retries. */
  readonly latencyMs: number
}

export interface Judge {
  ask<const Q extends JudgeQuestions>(
    request: JudgeRequest<Q>,
    options?: { signal?: AbortSignal }
  ): Promise<JudgeResult<Q>>
}

/** A Judge request that is malformed, or an answer that does not fit its question. */
export class JudgeError extends Error {
  override readonly name = "JudgeError"
}

/** Builds a yes/no question. */
export function noul(
  instructions: JudgeText,
  criteria?: NoulQuestion["criteria"]
): NoulQuestion {
  return criteria === undefined
    ? { type: "noul", instructions }
    : { type: "noul", instructions, criteria }
}

/** Builds a choice question whose answer is typed by the option keys. */
export function choice<
  const Criteria extends { readonly [option: string]: JudgeText | null },
>(
  instructions: JudgeText,
  criteria: Criteria
): ChoiceQuestion<keyof Criteria & string> {
  return { type: "choice", instructions, criteria }
}

/** The API's cap on options per choice (https://docs.typesafe.ai/api). */
export const MAX_CHOICE_OPTIONS = 255

/** Throws a `JudgeError` if the questions cannot be sent as they are. */
export function assertValidQuestions(questions: JudgeQuestions): void {
  const ids = Object.keys(questions)
  if (ids.length === 0) throw new JudgeError("A Judge call needs a question.")
  for (const id of ids) {
    const question = questions[id]
    if (isBlank(question.instructions)) {
      throw new JudgeError(`Question "${id}" has no instructions.`)
    }
    if (question.type === "choice") {
      const options = Object.keys(question.criteria)
      if (options.length < 2) {
        throw new JudgeError(`Choice "${id}" needs at least two options.`)
      }
      if (options.length > MAX_CHOICE_OPTIONS) {
        throw new JudgeError(
          `Choice "${id}" has ${options.length} options; the limit is ${MAX_CHOICE_OPTIONS}.`
        )
      }
    }
  }
}

/**
 * Checks that every question got an answer of its own type and range, and
 * returns the answers typed by the questions. Real and fake Judges both use
 * it, so a test cannot pass on an answer the real Judge would reject.
 */
export function checkAnswers<Q extends JudgeQuestions>(
  questions: Q,
  answers: Readonly<Record<string, unknown>>
): JudgeResult<Q>["answers"] {
  const checked: Record<string, JudgeAnswer> = {}
  for (const id of Object.keys(questions)) {
    checked[id] = checkAnswer(id, questions[id], answers[id])
  }
  return checked as JudgeResult<Q>["answers"]
}

function checkAnswer(
  id: string,
  question: JudgeQuestion,
  answer: unknown
): JudgeAnswer {
  if (!isRecord(answer)) throw new JudgeError(`No answer for "${id}".`)
  if (answer.type !== question.type) {
    throw new JudgeError(
      `Answer for "${id}" is a ${String(answer.type)}, expected a ${question.type}.`
    )
  }
  if (question.type === "noul") {
    if (!isProbability(answer.noul)) {
      throw new JudgeError(`Answer for "${id}" has no probability.`)
    }
    return { type: "noul", noul: answer.noul }
  }
  const options = Object.keys(question.criteria)
  const probabilities = answer.probabilities
  if (
    typeof answer.choice !== "string" ||
    !options.includes(answer.choice) ||
    !isRecord(probabilities) ||
    !options.every((option) => isProbability(probabilities[option])) ||
    !isProbability(answer.confidence)
  ) {
    throw new JudgeError(`Answer for "${id}" does not fit its options.`)
  }
  return {
    type: "choice",
    choice: answer.choice,
    probabilities: Object.fromEntries(
      options.map((option) => [option, probabilities[option] as number])
    ),
    confidence: answer.confidence,
  }
}

function isBlank(text: JudgeText): boolean {
  if (typeof text === "string") return text.trim() === ""
  return Array.isArray(text)
    ? text.length === 0
    : Object.keys(text).length === 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isProbability(value: unknown): value is number {
  return typeof value === "number" && value >= 0 && value <= 1
}
