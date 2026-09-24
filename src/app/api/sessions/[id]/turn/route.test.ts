import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"

import { apiErrorBodySchema } from "@/domain/api"
import { turnEventSchema } from "@/domain/events"
import { closeDb, getDb } from "@/db/client"
import { getSession, insertTurn, listTurns } from "@/db/sessions"
import { listWorldSummaries } from "@/db/worlds"
import { claimTurn } from "@/engine/turn-claims"
import { startSession } from "@/sessions/start-session"
import { storeLondonWorld } from "@/test/db"
import { openingTurn } from "@/test/turns"
import { deleteWorld } from "@/worlds/worlds"

import { POST } from "./route"

// The route's real models, replaced with fakes: no test calls a paid model.
vi.mock("@/engine/models", async () => {
  const { FakeDrafter } = await import("@/models/fake-drafter")
  const { FakeJudge } = await import("@/models/fake-judge")
  const { FakeWriter } = await import("@/models/fake-writer")
  return {
    turnModels: () => ({
      drafter: new FakeDrafter({
        outputs: { new_characters: { characters: [] } },
      }),
      writer: new FakeWriter(),
      judge: new FakeJudge({
        answers: {
          intent: "move",
          target: "Whitechapel High Street",
          classification: "on_script",
        },
      }),
    }),
  }
})

// `after` needs a request scope, which a test has not: keep its callbacks to run by hand.
const afterCallbacks = vi.hoisted(() => [] as (() => unknown)[])
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: (callback: () => unknown) => afterCallbacks.push(callback),
}))

// DB_URL is `:memory:` under test (vitest.config.ts): each test starts with a fresh, migrated database.
let sessionId: string
beforeEach(() => {
  afterCallbacks.length = 0
  vi.spyOn(console, "info").mockImplementation(() => {})
  closeDb()
  storeLondonWorld(getDb(), { id: "w", prefix: "mk", variant: "ready" })
  sessionId = startSession(getDb(), { worldId: "w", mode: "harness", seed: 1 })
    .session.id
})
afterAll(closeDb)

function playTurn(id: string, input: string | null) {
  return POST(
    new Request(`http://sands.test/api/sessions/${id}/turn`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ input }),
    }),
    { params: Promise.resolve({ id }) }
  )
}

async function events(response: Response) {
  const text = await response.text()
  return text
    .split("\n")
    .filter(Boolean)
    .map((line) => turnEventSchema.parse(JSON.parse(line)))
}

async function errorOf(response: Response) {
  return apiErrorBodySchema.parse(await response.json()).error
}

describe("POST /api/sessions/[id]/turn", () => {
  it("plays the Opening of a new Session and streams the shipped Turn", async () => {
    const response = await playTurn(sessionId, null)
    expect(response.status).toBe(200)
    const streamed = await events(response)
    expect(streamed.at(-1)).toMatchObject({
      type: "result",
      turn: { idx: 0, playerInput: null },
    })
    expect(listTurns(getDb(), sessionId)).toHaveLength(1)
  })

  it("keeps the Turn's Background work alive after the response, and it finishes", async () => {
    const streamed = await events(await playTurn(sessionId, null))
    expect(streamed.at(-1)).toMatchObject({
      type: "result",
      turn: { backgroundStatus: "pending" },
    })
    expect(afterCallbacks).toHaveLength(1)
    await afterCallbacks[0]()
    expect(listTurns(getDb(), sessionId)[0].backgroundStatus).toBe("done")
  })

  it("writes one Opening when two tabs ask for it at once", async () => {
    const [first, second] = await Promise.all([
      playTurn(sessionId, null),
      playTurn(sessionId, null),
    ])
    expect([first.status, second.status].sort()).toEqual([200, 409])
    const refused = first.status === 409 ? first : second
    expect((await errorOf(refused)).message).toMatch(/Opening is being written/)
    await events(first.status === 200 ? first : second)
    expect(listTurns(getDb(), sessionId)).toHaveLength(1)
    // Once written, a further Opening is refused before any model is called.
    const again = await playTurn(sessionId, null)
    expect(again.status).toBe(409)
    expect((await errorOf(again)).message).toMatch(/already had its Opening/)
  })

  it("plays a Turn after the Opening", async () => {
    insertTurn(getDb(), openingTurn(sessionId, `${sessionId}.mk-yard`))
    const streamed = await events(await playTurn(sessionId, "I walk east."))
    expect(streamed.at(-1)).toMatchObject({
      type: "result",
      turn: { idx: 1, state: { locationId: `${sessionId}.mk-whitechapel` } },
    })
  })

  it("refuses a Player input before the Opening, and a Turn while another is played", async () => {
    const early = await playTurn(sessionId, "I walk east.")
    expect(early.status).toBe(409)
    expect((await errorOf(early)).message).toMatch(
      /Opening has not been written/
    )

    insertTurn(getDb(), openingTurn(sessionId, `${sessionId}.mk-yard`))
    const release = claimTurn(sessionId)!
    try {
      const busy = await playTurn(sessionId, "I walk east.")
      expect(busy.status).toBe(409)
      expect((await errorOf(busy)).message).toMatch(/already being played/)
    } finally {
      release()
    }
  })

  it("refuses a Turn in a Session that has ended", async () => {
    const opening = openingTurn(sessionId, `${sessionId}.mk-yard`)
    insertTurn(getDb(), {
      ...opening,
      state: { ...opening.state, ending: "death" },
    })
    expect(getSession(getDb(), sessionId).ending).toBe("death")
    const response = await playTurn(sessionId, "I get up.")
    expect(response.status).toBe(409)
    expect((await errorOf(response)).message).toMatch(/has ended/)
  })
})

describe("a Turn for a Session whose World was deleted", () => {
  it("answers 404 not_found and writes nothing", async () => {
    deleteWorld(getDb(), "w")
    const response = await playTurn(sessionId, "I read the file.")
    expect(response.status).toBe(404)
    expect(await errorOf(response)).toEqual({
      code: "not_found",
      message: expect.stringMatching(/World may have been deleted/),
    })
    expect(listTurns(getDb(), sessionId)).toEqual([])
    expect(listWorldSummaries(getDb())).toEqual([])
  })
})
