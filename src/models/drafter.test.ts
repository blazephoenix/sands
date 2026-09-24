import { MockLanguageModelV4 } from "ai/test"
import { describe, expect, it, vi } from "vitest"
import { z } from "zod"

import { DrafterError } from "./drafter"
import { FakeDrafter } from "./fake-drafter"
import { OpenAIDrafter } from "./openai-drafter"
import type { JudgeLogger } from "./typesafe-judge"

const schema = z.object({ names: z.array(z.string()) })
const request = {
  call: "new_characters",
  instructions: "List every named character.",
  prompt: "Nell sold violets to a stranger called Finch.",
  schema,
}

describe("FakeDrafter", () => {
  it("answers each call from its script, in order, and records the request", async () => {
    const drafter = new FakeDrafter({
      outputs: { new_characters: [{ names: ["Finch"] }, { names: [] }] },
    })
    expect((await drafter.draft(request)).output).toEqual({ names: ["Finch"] })
    expect((await drafter.draft(request)).output).toEqual({ names: [] })
    expect(drafter.callsTo("new_characters")[0].request.prompt).toBe(
      request.prompt
    )
    await expect(drafter.draft(request)).rejects.toThrow(/not expected/)
  })

  it("rejects an answer the schema would reject, and throws a scripted error", async () => {
    await expect(
      new FakeDrafter({
        outputs: { new_characters: { names: "Finch" } },
      }).draft(request)
    ).rejects.toThrow(DrafterError)
    await expect(
      new FakeDrafter({
        outputs: { new_characters: new Error("rate limited") },
      }).draft(request)
    ).rejects.toThrow("rate limited")
  })

  it("stops when the signal is aborted", async () => {
    const drafter = new FakeDrafter({
      outputs: { new_characters: { names: [] } },
    })
    await expect(
      drafter.draft(request, { signal: AbortSignal.abort() })
    ).rejects.toThrow()
    expect(drafter.calls).toEqual([])
  })
})

function mockModel(text: string) {
  return new MockLanguageModelV4({
    modelId: "mock-drafter-1",
    doGenerate: async () => ({
      content: [{ type: "text", text }],
      finishReason: { unified: "stop", raw: undefined },
      usage: {
        inputTokens: {
          total: 120,
          noCache: 120,
          cacheRead: undefined,
          cacheWrite: undefined,
        },
        outputTokens: { total: 30, text: 10, reasoning: 20 },
      },
      warnings: [],
    }),
  })
}

function logger(): JudgeLogger & { lines: string[] } {
  const lines: string[] = []
  return {
    lines,
    info: (m) => lines.push(m),
    warn: (m) => lines.push(m),
    error: (m) => lines.push(m),
  }
}

describe("OpenAIDrafter", () => {
  it("returns the structured output and logs the model id the provider reports", async () => {
    const model = mockModel('{"names":["Finch"]}')
    const log = logger()
    const drafter = new OpenAIDrafter({ model, logger: log })

    const result = await drafter.draft(request)

    expect(result.output).toEqual({ names: ["Finch"] })
    expect(result.model).toBe("mock-drafter-1")
    expect(result.usage).toEqual({
      inputTokens: 120,
      outputTokens: 30,
      reasoningTokens: 20,
    })
    expect(log.lines[0]).toMatch(
      /^\[drafter\] call=new_characters model=mock-drafter-1 requested=mock-drafter-1 input_tokens=120 output_tokens=30 reasoning_tokens=20 latency_ms=\d+$/
    )
    const sent = model.doGenerateCalls[0]
    expect(sent.responseFormat).toMatchObject({
      type: "json",
      name: "new_characters",
    })
    expect(JSON.stringify(sent.prompt)).toContain(request.instructions)
    expect(sent.reasoning).toBe("low")
  })

  it("fails on an answer that does not fit the schema, and logs the failure", async () => {
    const log = logger()
    const drafter = new OpenAIDrafter({
      model: mockModel('{"names":"Finch"}'),
      logger: log,
      maxRetries: 0,
    })
    await expect(drafter.draft(request)).rejects.toThrow()
    expect(log.lines[0]).toMatch(/^\[drafter\] call=new_characters .*failed/)
  })

  it("refuses to start without DRAFTER_MODEL", () => {
    vi.stubEnv("DRAFTER_MODEL", "")
    try {
      expect(() => new OpenAIDrafter()).toThrow(/DRAFTER_MODEL is not set/)
    } finally {
      vi.unstubAllEnvs()
    }
  })
})
