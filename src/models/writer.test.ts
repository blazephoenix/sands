import { APICallError } from "ai"
import { MockLanguageModelV4 } from "ai/test"
import { describe, expect, it, vi } from "vitest"

import { FakeWriter } from "./fake-writer"
import { GrokWriter } from "./grok-writer"
import type { ModelLogger } from "./logger"
import type { WriterOutput } from "./writer"

const request = { instructions: "Write the scene.", prompt: "The Skeleton…" }

const reply: WriterOutput = {
  passage: "The fog lifted.",
  choices: ["Follow the lamp", "Call out"],
  ending: null,
}

function generated(text: string) {
  return {
    content: [{ type: "text" as const, text }],
    finishReason: { unified: "stop" as const, raw: undefined },
    usage: {
      inputTokens: {
        total: 900,
        noCache: 900,
        cacheRead: undefined,
        cacheWrite: undefined,
      },
      outputTokens: { total: 180, text: 180, reasoning: 0 },
    },
    warnings: [],
  }
}

function logger(): ModelLogger & { lines: string[] } {
  const lines: string[] = []
  return {
    lines,
    info: (m) => lines.push(m),
    warn: (m) => lines.push(m),
    error: (m) => lines.push(m),
  }
}

describe("GrokWriter", () => {
  it("returns the parsed reply and the raw text, and logs the model id the provider reports", async () => {
    const model = new MockLanguageModelV4({
      modelId: "mock-grok",
      doGenerate: async () => generated(JSON.stringify(reply)),
    })
    const log = logger()
    const result = await new GrokWriter({ model, logger: log }).write(request)
    expect(result).toMatchObject({
      output: reply,
      rawOutput: JSON.stringify(reply),
      model: "mock-grok",
      usage: { inputTokens: 900, outputTokens: 180 },
    })
    expect(log.lines[0]).toMatch(
      /^\[writer\] model=mock-grok requested=mock-grok effort=low input_tokens=900 output_tokens=180 reasoning_tokens=0 latency_ms=\d+$/
    )
    const call = model.doGenerateCalls[0]
    expect(JSON.stringify(call.prompt)).toContain(request.instructions)
    expect(call.responseFormat).toMatchObject({ type: "json" })
    expect(call.providerOptions).toEqual({ xai: { reasoningEffort: "low" } })
  })

  it("retries a failed call once, then succeeds", async () => {
    let calls = 0
    const model = new MockLanguageModelV4({
      doGenerate: async () => {
        calls += 1
        if (calls === 1)
          throw new APICallError({
            message: "overloaded",
            url: "https://api.x.ai",
            requestBodyValues: {},
            statusCode: 503,
            isRetryable: true,
          })
        return generated(JSON.stringify(reply))
      },
    })
    const result = await new GrokWriter({ model, logger: logger() }).write(
      request
    )
    expect(result.output.passage).toBe("The fog lifted.")
    expect(calls).toBe(2)
  }, 10_000)

  it("asks once more after an unusable reply, and fails on a second", async () => {
    const texts = ["not json", JSON.stringify(reply)]
    const once = new MockLanguageModelV4({
      doGenerate: async () => generated(texts.shift() ?? ""),
    })
    expect(
      (await new GrokWriter({ model: once, logger: logger() }).write(request))
        .output
    ).toEqual(reply)

    const never = new MockLanguageModelV4({
      doGenerate: async () =>
        generated(JSON.stringify({ ...reply, passage: "  " })),
    })
    await expect(
      new GrokWriter({ model: never, logger: logger() }).write(request)
    ).rejects.toThrow(/unusable reply twice: an empty Passage/)
    expect(never.doGenerateCalls).toHaveLength(2)
  })

  it("refuses to start without WRITER_MODEL", () => {
    vi.stubEnv("WRITER_MODEL", "")
    try {
      expect(() => new GrokWriter()).toThrow(/WRITER_MODEL is not set/)
    } finally {
      vi.unstubAllEnvs()
    }
  })
})

describe("FakeWriter", () => {
  it("answers from its script in order, throws scripted errors, and records every call", async () => {
    const writer = new FakeWriter({ replies: ["A", new Error("down")] })
    expect((await writer.write(request)).output.passage).toBe("A")
    await expect(writer.write(request)).rejects.toThrow("down")
    await expect(writer.write(request)).rejects.toThrow(/not expected/)
    expect(writer.calls).toHaveLength(3)
  })
})
