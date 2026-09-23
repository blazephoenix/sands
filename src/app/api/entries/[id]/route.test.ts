import { beforeEach, describe, expect, it } from "vitest"

import { getWorldResponseSchema, patchEntryResponseSchema } from "@/domain/api"
import { SESSION_IDS } from "@/fixtures/ids"
import { resetStore } from "@/fixtures/store"
import { WORLD_IDS } from "@/fixtures/worlds"

import { GET } from "../../worlds/[id]/route"
import { PATCH } from "./route"

beforeEach(() => {
  resetStore()
})

const params = (id: string) => ({ params: Promise.resolve({ id }) })

async function patch(id: string, body: unknown) {
  const response = await PATCH(
    new Request(`http://sands.test/api/entries/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    params(id)
  )
  return { status: response.status, body: await response.json() }
}

async function getWorld(id: string) {
  const response = await GET(
    new Request(`http://sands.test/api/worlds/${id}`),
    params(id)
  )
  return getWorldResponseSchema.parse(await response.json())
}

describe("PATCH /api/entries/[id] returns fresh solvability, and GET /api/worlds/[id] returns what it stored", () => {
  it("fails the World when a required Clue is rejected and passes it again on restore", async () => {
    const rejected = await patch("wc-c2", { action: "reject" })
    expect(rejected.status).toBe(200)
    const body = patchEntryResponseSchema.parse(rejected.body)
    expect(body.entry.status).toBe("rejected")
    expect(body.solvability).toMatchObject({
      passed: false,
      gaps: [{ code: "missing_clue", entryId: "wc-c2" }],
    })
    expect((await getWorld(WORLD_IDS.review)).world.solvability).toEqual(
      body.solvability
    )

    const restored = patchEntryResponseSchema.parse(
      (await patch("wc-c2", { action: "restore", status: "proposed" })).body
    )
    expect(restored.solvability?.passed).toBe(true)
    expect((await getWorld(WORLD_IDS.review)).world.solvability).toEqual(
      restored.solvability
    )
  })

  it("answers null solvability for a Session copy, as before", async () => {
    const { status, body } = await patch(`${SESSION_IDS.midPlay}.mk-c2`, {
      action: "accept",
    })
    expect(status).toBe(200)
    expect(patchEntryResponseSchema.parse(body).solvability).toBeNull()
  })

  it("still refuses a locked Entry with 409 and leaves the stored result alone", async () => {
    const before = (await getWorld(WORLD_IDS.review)).world.solvability
    const { status, body } = await patch("wc-yard", { action: "reject" })
    expect(status).toBe(409)
    expect(body.error.code).toBe("conflict")
    expect((await getWorld(WORLD_IDS.review)).world.solvability).toEqual(before)
  })
})
