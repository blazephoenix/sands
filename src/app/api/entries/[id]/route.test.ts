import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { getWorldResponseSchema, patchEntryResponseSchema } from "@/domain/api"
import { copyId, startSession } from "@/sessions/start-session"
import { closeDb, getDb } from "@/db/client"
import { storeLondonWorld } from "@/test/db"

import { GET } from "../../worlds/[id]/route"
import { PATCH } from "./route"

// DB_URL is `:memory:` under test (vitest.config.ts): each test starts with a fresh, migrated database.
beforeEach(() => {
  closeDb()
  storeLondonWorld(getDb(), { id: "w-review", prefix: "wc", variant: "review" })
})
afterAll(closeDb)

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
    const stored = await getWorld("w-review")
    expect(stored.world.solvability).toEqual(body.solvability)
    expect(stored.entries.find((e) => e.id === "wc-c2")).toEqual(body.entry)

    const restored = patchEntryResponseSchema.parse(
      (await patch("wc-c2", { action: "restore", status: "proposed" })).body
    )
    expect(restored.solvability?.passed).toBe(true)
    expect((await getWorld("w-review")).world.solvability).toEqual(
      restored.solvability
    )
  })

  it("saves a change to a Session copy that opens a Gap, and answers the Session's solvability", async () => {
    const { session } = startSession(getDb(), {
      worldId: "w-review",
      mode: "harness",
    })
    // The review World's arrest needs every one of C1-C4.
    const { status, body } = await patch(copyId(session.id, "wc-c2"), {
      action: "reject",
    })
    expect(status).toBe(200)
    const { entry, solvability } = patchEntryResponseSchema.parse(body)
    expect(entry.status).toBe("rejected")
    expect(solvability).toMatchObject({
      passed: false,
      gaps: [{ entryId: copyId(session.id, "wc-c2") }],
    })
  })

  it("refuses a locked Entry with 409 and leaves the stored result alone", async () => {
    const before = (await getWorld("w-review")).world.solvability
    const { status, body } = await patch("wc-yard", { action: "reject" })
    expect(status).toBe(409)
    expect(body.error.code).toBe("conflict")
    expect((await getWorld("w-review")).world.solvability).toEqual(before)
  })

  it("answers 404 for an unknown Entry and 422 for a request off the contract", async () => {
    expect((await patch("nope", { action: "accept" })).status).toBe(404)
    expect((await patch("wc-c2", { action: "shred" })).status).toBe(422)
  })
})
