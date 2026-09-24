import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { apiErrorBodySchema } from "@/domain/api"
import { closeDb, getDb } from "@/db/client"
import { listTurns } from "@/db/sessions"
import { listWorldSummaries } from "@/db/worlds"
import { startSession } from "@/sessions/start-session"
import { storeLondonWorld } from "@/test/db"
import { deleteWorld } from "@/worlds/worlds"

import { POST } from "./route"

// DB_URL is `:memory:` under test (vitest.config.ts): each test starts with a fresh, migrated database.
let sessionId: string
beforeEach(() => {
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

describe("the Turn route, until the Turn engine lands", () => {
  it("answers 501 not_built, saying play is not built yet and what to do", async () => {
    const response = await playTurn(sessionId, null)
    expect(response.status).toBe(501)
    expect(apiErrorBodySchema.parse(await response.json()).error).toEqual({
      code: "not_built",
      message: expect.stringMatching(/^Play is not built yet.+come back/),
    })
  })
})

describe("a Turn for a Session whose World was deleted", () => {
  it("answers 404 not_found and writes nothing", async () => {
    deleteWorld(getDb(), "w")
    const response = await playTurn(sessionId, "I read the file.")
    expect(response.status).toBe(404)
    expect(apiErrorBodySchema.parse(await response.json()).error).toEqual({
      code: "not_found",
      message: expect.stringMatching(/World may have been deleted/),
    })
    expect(listTurns(getDb(), sessionId)).toEqual([])
    expect(listWorldSummaries(getDb())).toEqual([])
  })
})
