import { beforeEach, describe, expect, it } from "vitest"

import { turnEventSchema, type TurnEvent } from "@/domain/events"
import { createSession, listTurns, SESSION_IDS } from "@/fixtures/sessions"
import { resetStore } from "@/fixtures/store"
import { WORLD_IDS } from "@/fixtures/worlds"

import { POST } from "./route"

beforeEach(() => {
  resetStore()
})

const params = (id: string) => ({ params: Promise.resolve({ id }) })

function turnRequest(
  sessionId: string,
  input: string | null,
  options: { scenario?: string; signal?: AbortSignal } = {}
) {
  const query = options.scenario ? `?scenario=${options.scenario}` : ""
  return new Request(
    `http://sands.test/api/sessions/${sessionId}/turn${query}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ input }),
      signal: options.signal,
    }
  )
}

async function events(response: Response): Promise<TurnEvent[]> {
  const text = await response.text()
  return text
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => turnEventSchema.parse(JSON.parse(line)))
}

const newSessionId = () =>
  createSession({ worldId: WORLD_IDS.ready, mode: "harness" }).session.id

describe("POST /api/sessions/[id]/turn and the Opening", () => {
  it("answers 409 to an Opening for a Session that already has Turns", async () => {
    const response = await POST(
      turnRequest(SESSION_IDS.midPlay, null),
      params(SESSION_IDS.midPlay)
    )
    expect(response.status).toBe(409)
    expect((await response.json()).error).toMatchObject({
      code: "conflict",
      message: expect.stringMatching(/already had its Opening/),
    })
  })

  it("answers 409 to a Player input for a Session that has not had its Opening", async () => {
    const id = newSessionId()
    const response = await POST(
      turnRequest(id, "I read the case file."),
      params(id)
    )
    expect(response.status).toBe(409)
    expect((await response.json()).error.message).toMatch(/not had its Opening/)
    expect(listTurns(id)).toEqual([])
  })

  it("answers 409 to a second Opening while the first is being written, and frees the Session when the first goes away", async () => {
    const id = newSessionId()
    const first = new AbortController()
    const running = await POST(
      turnRequest(id, null, { signal: first.signal }),
      params(id)
    )
    expect(running.status).toBe(200)

    const second = await POST(turnRequest(id, null), params(id))
    expect(second.status).toBe(409)
    expect((await second.json()).error.message).toMatch(/already being written/)

    first.abort()
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(listTurns(id)).toEqual([])
    const retry = await POST(
      turnRequest(id, null, { signal: AbortSignal.timeout(50) }),
      params(id)
    )
    expect(retry.status).toBe(200)
  })

  it(
    "plays the Opening: writing and judging, then the whole Turn 0",
    { timeout: 10_000 },
    async () => {
      const id = newSessionId()
      const response = await POST(turnRequest(id, null), params(id))
      const stream = await events(response)
      expect(
        stream
          .filter((e) => e.type === "phase")
          .map((e) => e.type === "phase" && e.phase)
      ).toEqual(["writing", "judging"])
      const result = stream.at(-1)
      expect(result?.type).toBe("result")
      if (result?.type !== "result") return
      expect(result.turn).toMatchObject({ idx: 0, playerInput: null })
      expect(listTurns(id)).toHaveLength(1)
    }
  )

  it(
    "keeps no Turns when the Judge is out, and plays once the scenario is cleared",
    { timeout: 15_000 },
    async () => {
      const id = newSessionId()
      const failed = await events(
        await POST(
          turnRequest(id, null, { scenario: "judge-outage" }),
          params(id)
        )
      )
      expect(failed.at(-1)).toMatchObject({
        type: "error",
        code: "judge_outage",
      })
      expect(listTurns(id)).toEqual([])

      const retried = await events(
        await POST(turnRequest(id, null), params(id))
      )
      expect(retried.at(-1)?.type).toBe("result")
      expect(listTurns(id)).toHaveLength(1)
    }
  )
})
