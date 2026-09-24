/**
 * A Drafter for tests: no network, scripted answers, and the same schema
 * check as the real one, so a test cannot pass on an answer the real Drafter
 * would reject.
 *
 * Answers are scripted per call name. A list answers successive calls of that
 * name in order, and running out is an error, so an unexpected extra call
 * fails the test. An `Error` in the script is thrown instead of answered.
 *
 *   const drafter = new FakeDrafter({
 *     outputs: {
 *       world_call: worldDraft,
 *       story_logic_call: [unsolvable, solvable],
 *     },
 *   })
 */
import {
  assertValidCall,
  DrafterError,
  type Drafter,
  type DrafterRequest,
  type DrafterResult,
} from "./drafter"

export type FakeDrafterOutput = unknown

export interface FakeDrafterOptions {
  /** Answers by call name: one answer for every call, or one per call in order. */
  outputs?: Readonly<Record<string, FakeDrafterOutput | FakeDrafterOutput[]>>
  /** The model id the fake reports. */
  model?: string
}

export interface FakeDrafterCall {
  readonly request: DrafterRequest<unknown>
  readonly output: unknown
}

export class FakeDrafter implements Drafter {
  readonly model: string
  /** Every successful call, oldest first. */
  readonly calls: FakeDrafterCall[] = []
  readonly #options: FakeDrafterOptions
  readonly #counts = new Map<string, number>()

  constructor(options: FakeDrafterOptions = {}) {
    this.#options = options
    this.model = options.model ?? "fake-drafter"
  }

  /** The calls of one name, oldest first. */
  callsTo(call: string): FakeDrafterCall[] {
    return this.calls.filter((c) => c.request.call === call)
  }

  async draft<Output>(
    request: DrafterRequest<Output>,
    options: { signal?: AbortSignal } = {}
  ): Promise<DrafterResult<Output>> {
    options.signal?.throwIfAborted()
    assertValidCall(request.call)
    const index = this.#counts.get(request.call) ?? 0
    this.#counts.set(request.call, index + 1)

    const script = this.#options.outputs?.[request.call]
    if (script === undefined) {
      throw new DrafterError(`FakeDrafter has no answer for "${request.call}".`)
    }
    const given = Array.isArray(script) ? script : [script]
    if (Array.isArray(script) && index >= script.length) {
      throw new DrafterError(
        `FakeDrafter has ${script.length} answers for "${request.call}"; call ${index + 1} was not expected.`
      )
    }
    const answer = given[Math.min(index, given.length - 1)]
    if (answer instanceof Error) throw answer

    const parsed = request.schema.safeParse(answer)
    if (!parsed.success) {
      throw new DrafterError(
        `FakeDrafter's answer for "${request.call}" does not fit its schema: ${parsed.error.message}`
      )
    }
    this.calls.push({ request, output: parsed.data })
    return {
      output: parsed.data,
      model: this.model,
      usage: { inputTokens: 0, outputTokens: 0, reasoningTokens: 0 },
      latencyMs: 0,
    }
  }
}
