/**
 * Streaming NDJSON responses for the long-running routes (setup, Turn), per
 * ADR-0010. One JSON object per line; progress only, never prose (ADR-0003).
 *
 *   return ndjsonResponse<SetupEvent>(async (emit, elapsed) => {
 *     emit({ type: "step", step: "parse", status: "started", attempt: 1, maxAttempts: 1, detail: null, at: elapsed() })
 *     ...
 *     emit({ type: "result", world, entries, at: elapsed() })
 *   })
 *
 * If `run` throws, the stream ends with an `internal` error event rather than
 * a broken connection. If the client disconnects, `signal` aborts.
 */
export function ndjsonResponse<Event extends { type: string }>(
  run: (emit: (event: Event) => void, elapsed: () => number, signal: AbortSignal) => Promise<void>,
  init: { request?: Request } = {}
): Response {
  const encoder = new TextEncoder()
  const started = Date.now()
  const elapsed = () => Date.now() - started
  const controller = new AbortController()
  init.request?.signal.addEventListener("abort", () => controller.abort())

  const stream = new ReadableStream<Uint8Array>({
    async start(sink) {
      let closed = false
      const emit = (event: Event) => {
        if (closed || controller.signal.aborted) return
        sink.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
      }
      try {
        await run(emit, elapsed, controller.signal)
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("[sands] stream failed", error)
          emit({
            type: "error",
            code: "internal",
            message: "The server stopped unexpectedly. Try again.",
            at: elapsed(),
          } as unknown as Event)
        }
      } finally {
        closed = true
        try {
          sink.close()
        } catch {
          // Already closed by a disconnect.
        }
      }
    },
    cancel() {
      controller.abort()
    },
  })

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  })
}
