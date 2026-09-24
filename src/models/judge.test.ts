import { describe, expect, it, vi } from "vitest"

import { FakeJudge } from "./fake-judge"
import { choice, JudgeError, noul } from "./judge"
import { TypeSafeJudge, type JudgeLogger } from "./typesafe-judge"

const state = { drafts: ["Nell set down her basket of violets."] }

const questions = {
  agency_0: noul(
    "Does the Player character say or do more than `player_input`?",
    {
      true: "The Player character acts or speaks beyond the input.",
      false: "The Player character does only what the input says.",
    }
  ),
  intent: choice("What kind of action is `player_input`?", {
    move: null,
    examine: null,
    question: null,
    arrest: null,
    other: "None of the above.",
  }),
}

describe("FakeJudge", () => {
  it("answers every Noul with a clear no and every Choice with its first option", async () => {
    const judge = new FakeJudge()
    const { answers, model } = await judge.ask({ state, questions })

    expect(answers.agency_0).toEqual({ type: "noul", noul: 0.05 })
    expect(answers.intent.choice).toBe("move")
    expect(answers.intent.probabilities.move).toBe(1)
    expect(answers.intent.confidence).toBe(1)
    expect(model).toBe("fake-judge")
  })

  it("applies answers given by question id", async () => {
    const judge = new FakeJudge({
      answers: { agency_0: 0.82, intent: "arrest" },
    })
    const { answers } = await judge.ask({ state, questions })

    expect(answers.agency_0.noul).toBe(0.82)
    expect(answers.intent.choice).toBe("arrest")
    expect(answers.intent.probabilities.move).toBe(0)
  })

  it("computes answers from the question and state", async () => {
    const judge = new FakeJudge({
      answer: (id, question, s) =>
        question.type === "noul" && JSON.stringify(s).includes("violets")
          ? 0.7
          : undefined,
    })
    const { answers } = await judge.ask({ state, questions })

    expect(answers.agency_0.noul).toBe(0.7)
    expect(answers.intent.choice).toBe("move")
  })

  it("records each call with its request and result", async () => {
    const judge = new FakeJudge()
    await judge.ask({ state, questions })
    await judge.ask({ state, questions: { only: noul("Is it night?") } })

    expect(judge.calls).toHaveLength(2)
    expect(Object.keys(judge.calls[1].request.questions)).toEqual(["only"])
    expect(judge.calls[0].result.answers.intent).toMatchObject({
      choice: "move",
    })
  })

  it("rejects what the real Judge would reject", async () => {
    const judge = new FakeJudge({ answers: { intent: "flee" } })

    await expect(judge.ask({ state, questions: {} })).rejects.toThrow(
      JudgeError
    )
    await expect(
      judge.ask({
        state,
        questions: { one: choice("Pick one", { only: null }) },
      })
    ).rejects.toThrow(/at least two options/)
    await expect(judge.ask({ state, questions })).rejects.toThrow(
      /does not fit its options/
    )
    await expect(
      new FakeJudge({ answers: { agency_0: 1.4 } }).ask({ state, questions })
    ).rejects.toThrow(/no probability/)
  })

  it("stops when the signal is already aborted", async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(
      new FakeJudge().ask({ state, questions }, { signal: controller.signal })
    ).rejects.toThrow()
  })
})

describe("TypeSafeJudge", () => {
  function judgeAnswering(body: unknown, model = "jev-1.13.0") {
    // Records the request; the SDK passes (url, init).
    const fetch = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
      async () =>
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
    )
    const logger: JudgeLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
    const judge = new TypeSafeJudge({
      model,
      logger,
      maxRetries: 0,
      client: { apiKey: "test-key", fetch },
    })
    return { judge, fetch, logger }
  }

  const reply = (model: string) => ({
    model,
    answers: {
      agency_0: { type: "noul", noul: 0.91 },
      intent: {
        type: "choice",
        choice: "question",
        probabilities: {
          move: 0,
          examine: 0.1,
          question: 0.9,
          arrest: 0,
          other: 0,
        },
        confidence: 0.8,
      },
    },
    usage: { input_tokens: 412, output_tokens: 30 },
  })

  it("sends the pinned model and logs the version Jev reports", async () => {
    const { judge, fetch, logger } = judgeAnswering(reply("jev-1.13.0"))
    const result = await judge.ask({ state, questions })

    const body = JSON.parse(String(fetch.mock.calls[0][1]?.body))
    expect(body.model).toBe("jev-1.13.0")
    expect(Object.keys(body.questions)).toEqual(["agency_0", "intent"])
    expect(result.model).toBe("jev-1.13.0")
    expect(result.answers.agency_0.noul).toBe(0.91)
    expect(result.answers.intent.choice).toBe("question")
    expect(result.usage).toEqual({ inputTokens: 412, outputTokens: 30 })
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining("model=jev-1.13.0")
    )
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it("warns when Jev answers as a different version than the pinned one", async () => {
    const { judge, logger } = judgeAnswering(reply("jev-1.14.0"))
    await judge.ask({ state, questions })

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        "pinned jev-1.13.0 but Jev answered as jev-1.14.0"
      )
    )
  })

  it("does not warn when an alias resolves to a version", async () => {
    const { judge, logger } = judgeAnswering(reply("jev-1.13.0"), "jev-latest")
    await judge.ask({ state, questions })

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining("model=jev-1.13.0 requested=jev-latest")
    )
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it("rejects a reply that leaves a question unanswered", async () => {
    const partial = reply("jev-1.13.0")
    const { judge } = judgeAnswering({
      ...partial,
      answers: { agency_0: partial.answers.agency_0 },
    })

    await expect(judge.ask({ state, questions })).rejects.toThrow(
      /No answer for "intent"/
    )
  })
})
