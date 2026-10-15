/**
 * A Writer for tests: no network, scripted replies, and each call recorded.
 *
 * A list answers successive calls in order, and running out is an error, so
 * an unexpected extra call fails the test. An `Error` in the script is thrown
 * instead of answered. A function computes each reply from the request and
 * the call's index. A plain string is a Passage with two stock choices.
 *
 *   const writer = new FakeWriter({ replies: ["The door opens.", { passage, choices: [], ending }] })
 */
import {
  WriterError,
  type Writer,
  type WriterOutput,
  type WriterRequest,
  type WriterResult,
} from "./writer"

type Scripted = string | WriterOutput | Error

export interface FakeWriterOptions {
  replies?:
    readonly Scripted[] | ((request: WriterRequest, call: number) => Scripted)
}

export class FakeWriter implements Writer {
  readonly model = "fake-writer"
  /** Every request, oldest first, answered or not. */
  readonly calls: WriterRequest[] = []
  readonly #options: FakeWriterOptions

  constructor(options: FakeWriterOptions = {}) {
    this.#options = options
  }

  async write(
    request: WriterRequest,
    options: { signal?: AbortSignal } = {}
  ): Promise<WriterResult> {
    options.signal?.throwIfAborted()
    const call = this.calls.length
    this.calls.push(request)
    const script = this.#options.replies
    let answer: Scripted
    if (typeof script === "function") answer = script(request, call)
    else if (script) {
      if (call >= script.length)
        throw new WriterError(
          `FakeWriter has ${script.length} replies; call ${call + 1} was not expected.`
        )
      answer = script[call]
    } else answer = `Passage ${call + 1}.`
    if (answer instanceof Error) throw answer
    const output: WriterOutput =
      typeof answer === "string"
        ? { passage: answer, choices: ["Go on", "Wait"], ending: null }
        : answer
    return {
      output,
      rawOutput: JSON.stringify(output),
      model: this.model,
      usage: { inputTokens: 0, outputTokens: 0 },
      latencyMs: 0,
    }
  }
}
