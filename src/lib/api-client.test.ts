import { describe, expect, it } from "vitest"

import { turnEventSchema, type TurnEvent } from "@/domain/events"
import { ndjsonResponse } from "@/server/ndjson"

import { ApiError, readNdjson } from "./api-client"

async function collect<T>(iterable: AsyncIterable<T>) {
  const out: T[] = []
  for await (const item of iterable) out.push(item)
  return out
}

describe("NDJSON progress streams", () => {
  it("round-trips typed events from the server helper to the client reader", async () => {
    const response = ndjsonResponse<TurnEvent>(async (emit, elapsed) => {
      emit({ type: "phase", phase: "reading", round: null, at: elapsed() })
      emit({ type: "phase", phase: "writing", round: 1, at: elapsed() })
      emit({ type: "error", code: "judge_outage", message: "The Judge did not answer. Try again.", at: elapsed() })
    })
    expect(response.headers.get("content-type")).toContain("application/x-ndjson")
    const events = await collect(readNdjson(response, turnEventSchema))
    expect(events.map((e) => e.type)).toEqual(["phase", "phase", "error"])
  })

  it("reads events split across chunks", async () => {
    const lines = `${JSON.stringify({ type: "phase", phase: "judging", round: 2, at: 5 })}\n${JSON.stringify({ type: "error", code: "internal", message: "x", at: 6 })}\n`
    const encoder = new TextEncoder()
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        for (let i = 0; i < lines.length; i += 7) controller.enqueue(encoder.encode(lines.slice(i, i + 7)))
        controller.close()
      },
    })
    const events = await collect(readNdjson(new Response(body), turnEventSchema))
    expect(events).toHaveLength(2)
  })

  it("throws stream_incomplete when the stream ends without a result or error", async () => {
    const response = ndjsonResponse<TurnEvent>(async (emit, elapsed) => {
      emit({ type: "phase", phase: "reading", round: null, at: elapsed() })
    })
    await expect(collect(readNdjson(response, turnEventSchema))).rejects.toMatchObject({ code: "stream_incomplete" })
  })

  it("ends a stream whose producer throws with an internal error event", async () => {
    const response = ndjsonResponse<TurnEvent>(async () => {
      throw new Error("boom")
    })
    const events = await collect(readNdjson(response, turnEventSchema))
    expect(events).toEqual([expect.objectContaining({ type: "error", code: "internal" })])
  })

  it("rejects events that break the contract", async () => {
    const body = new Response(`${JSON.stringify({ type: "phase", phase: "dancing", round: null, at: 0 })}\n`)
    await expect(collect(readNdjson(body, turnEventSchema))).rejects.toBeInstanceOf(ApiError)
  })
})
