import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { apiErrorBodySchema, listWorldsResponseSchema } from "@/domain/api"
import { closeDb, getDb } from "@/db/client"
import { getWorld, updateWorld } from "@/db/worlds"
import { startSession } from "@/sessions/start-session"
import { storeLondonWorld } from "@/test/db"

import { GET as listWorlds } from "../route"
import { DELETE, GET } from "./route"

// DB_URL is `:memory:` under test (vitest.config.ts): each test starts with a fresh, migrated database.
beforeEach(() => {
  closeDb()
  storeLondonWorld(getDb(), { id: "w-ready", prefix: "mk", variant: "ready" })
  startSession(getDb(), { worldId: "w-ready", mode: "harness", seed: 1 })
})
afterAll(closeDb)

const params = (id: string) => ({ params: Promise.resolve({ id }) })

function del(id: string) {
  return DELETE(
    new Request(`http://sands.test/api/worlds/${id}`, { method: "DELETE" }),
    params(id)
  )
}

function get(id: string) {
  return GET(new Request(`http://sands.test/api/worlds/${id}`), params(id))
}

async function listedIds() {
  const { worlds } = listWorldsResponseSchema.parse(
    await (await listWorlds()).json()
  )
  return worlds.map((world) => world.id)
}

describe("DELETE /api/worlds/[id]", () => {
  it("answers 204 with no body, and the World is gone from every read", async () => {
    const response = await del("w-ready")
    expect(response.status).toBe(204)
    expect(await response.text()).toBe("")
    expect((await get("w-ready")).status).toBe(404)
    expect(await listedIds()).toEqual([])
  })

  it("answers 404 for an unknown World, or one already deleted", async () => {
    await del("w-ready")
    for (const id of ["w-ready", "nope"]) {
      const response = await del(id)
      expect(response.status).toBe(404)
      expect(apiErrorBodySchema.parse(await response.json()).error.code).toBe(
        "not_found"
      )
    }
  })

  it("answers 409 while setup is running, saying why, and keeps the World", async () => {
    const world = getWorld(getDb(), "w-ready")
    updateWorld(getDb(), { ...world, setupStatus: "drafting" })
    const response = await del("w-ready")
    expect(response.status).toBe(409)
    expect(apiErrorBodySchema.parse(await response.json()).error).toEqual({
      code: "conflict",
      message: expect.stringMatching(/^Setup is running.+Wait for setup/),
    })
    expect((await get("w-ready")).status).toBe(200)
    expect(await listedIds()).toEqual(["w-ready"])
  })
})
