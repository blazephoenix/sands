/**
 * A Writer for tests: no network, scripted Drafts, and each call recorded.
 *
 * A list answers successive calls in order, and running out is an error, so
 * an unexpected extra Draft fails the test. An `Error` in the script is
 * thrown instead of answered. A function computes each Draft from the
 * request and the call's index.
 *
 *   const writer = new FakeWriter({ drafts: ["Draft A", "Draft B"] })
 */
import {
  WriterError,
  type Writer,
  type WriterRequest,
  type WriterResult,
} from "./writer"

type Scripted = string | Error

export interface FakeWriterOptions {
  drafts?:
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
    const script = this.#options.drafts
    let answer: Scripted
    if (typeof script === "function") answer = script(request, call)
    else if (script) {
      if (call >= script.length)
        throw new WriterError(
          `FakeWriter has ${script.length} Drafts; call ${call + 1} was not expected.`
        )
      answer = script[call]
    } else answer = `Draft ${call + 1}.`
    if (answer instanceof Error) throw answer
    return {
      text: answer,
      model: this.model,
      usage: { inputTokens: 0, outputTokens: 0 },
      latencyMs: 0,
      reasoning: null,
    }
  }
}
