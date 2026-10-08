import { APICallError } from "ai"
import { MockLanguageModelV4 } from "ai/test"
import { describe, expect, it, vi } from "vitest"

import { FakeWriter } from "./fake-writer"
import { GrokWriter } from "./grok-writer"
import type { ModelLogger } from "./logger"

const maxOutputTokens = 6000

const request = { instructions: "Write the scene.", prompt: "Directive: …" }

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
  it("returns the Draft and logs the model id the provider reports", async () => {
    const model = new MockLanguageModelV4({
      modelId: "mock-grok",
      doGenerate: async () => generated("  The fog lifted.  "),
    })
    const log = logger()
    const result = await new GrokWriter({
      model,
      logger: log,
      maxOutputTokens,
    }).write(request)
    expect(result).toMatchObject({
      text: "The fog lifted.",
      model: "mock-grok",
      usage: { inputTokens: 900, outputTokens: 180 },
    })
    expect(log.lines[0]).toMatch(
      /^\[writer\] model=mock-grok requested=mock-grok input_tokens=900 output_tokens=180 reasoning_tokens=0 latency_ms=\d+$/
    )
    expect(JSON.stringify(model.doGenerateCalls[0].prompt)).toContain(
      request.instructions
    )
  })

  it("caps output at the ceiling it is given and logs reasoning tokens", async () => {
    const model = new MockLanguageModelV4({
      doGenerate: async () => generated("The fog lifted."),
    })
    const log = logger()
    await new GrokWriter({ model, logger: log, maxOutputTokens }).write(request)
    expect(model.doGenerateCalls[0].maxOutputTokens).toBe(maxOutputTokens)
    expect(log.lines[0]).toMatch(/ reasoning_tokens=0 /)
  })

  it("asks for a reasoning summary and returns it with the Draft", async () => {
    const model = new MockLanguageModelV4({
      doGenerate: async () => {
        const result = generated("The fog lifted.")
        return {
          ...result,
          content: [
            { type: "reasoning" as const, text: "  Carrow resents the ask.  " },
            ...result.content,
          ],
        }
      },
    })
    const result = await new GrokWriter({
      model,
      logger: logger(),
      maxOutputTokens,
    }).write(request)
    expect(result.reasoning).toBe("Carrow resents the ask.")
    expect(model.doGenerateCalls[0].reasoning).toBe("provider-default")
    expect(model.doGenerateCalls[0].providerOptions).toEqual({
      xai: { reasoningSummary: "auto" },
    })
  })

  it("sends the reasoning effort it is given", async () => {
    const model = new MockLanguageModelV4({
      doGenerate: async () => generated("The fog lifted."),
    })
    await new GrokWriter({
      model,
      logger: logger(),
      maxOutputTokens,
      reasoning: "low",
    }).write(request)
    expect(model.doGenerateCalls[0].reasoning).toBe("low")
  })

  it("returns no reasoning when the model gives none", async () => {
    const model = new MockLanguageModelV4({
      doGenerate: async () => generated("The fog lifted."),
    })
    const result = await new GrokWriter({
      model,
      logger: logger(),
      maxOutputTokens,
    }).write(request)
    expect(result.reasoning).toBeNull()
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
        return generated("Second time.")
      },
    })
    const result = await new GrokWriter({
      model,
      logger: logger(),
      maxOutputTokens,
    }).write(request)
    expect(result.text).toBe("Second time.")
    expect(calls).toBe(2)
  }, 10_000)

  it("asks once more after an empty Draft, and fails on a second", async () => {
    const texts = ["   ", "At last."]
    const once = new MockLanguageModelV4({
      doGenerate: async () => generated(texts.shift() ?? ""),
    })
    expect(
      (
        await new GrokWriter({
          model: once,
          logger: logger(),
          maxOutputTokens,
        }).write(request)
      ).text
    ).toBe("At last.")

    const never = new MockLanguageModelV4({
      doGenerate: async () => generated("   "),
    })
    await expect(
      new GrokWriter({ model: never, logger: logger(), maxOutputTokens }).write(
        request
      )
    ).rejects.toThrow(/empty Draft twice/)
    expect(never.doGenerateCalls).toHaveLength(2)
  })

  it("refuses to start without WRITER_MODEL", () => {
    vi.stubEnv("WRITER_MODEL", "")
    try {
      expect(() => new GrokWriter({ maxOutputTokens })).toThrow(
        /WRITER_MODEL is not set/
      )
    } finally {
      vi.unstubAllEnvs()
    }
  })
})

describe("FakeWriter", () => {
  it("answers from its script in order, throws scripted errors, and records every call", async () => {
    const writer = new FakeWriter({ drafts: ["A", new Error("down")] })
    expect((await writer.write(request)).text).toBe("A")
    await expect(writer.write(request)).rejects.toThrow("down")
    await expect(writer.write(request)).rejects.toThrow(/not expected/)
    expect(writer.calls).toHaveLength(3)
  })
})
