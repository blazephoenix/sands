import { describe, expect, it, vi } from "vitest"

import { apiErrorBodySchema, getWorldResponseSchema } from "@/domain/api"
import { setupEventSchema } from "@/domain/events"
import { getDb } from "@/db/client"
import { londonBriefDocument } from "@/test/london"
import { createWorld } from "@/worlds/worlds"

import { GET as getWorld } from "../route"
import { POST as runSetup } from "./route"

// The route's real models, replaced with fakes: no test calls a paid model.
vi.mock("@/setup/models", async () => {
  const { FakeDrafter } = await import("@/models/fake-drafter")
  const { FakeJudge } = await import("@/models/fake-judge")
  const drafts = await import("@/test/setup-drafts")
  return {
    setupModels: () => ({
      drafter: new FakeDrafter({
        outputs: {
          world_call: drafts.londonWorldDraft,
          story_logic_call: drafts.londonStoryDraft,
        },
      }),
      judge: new FakeJudge(),
    }),
  }
})

const params = (id: string) => ({ params: Promise.resolve({ id }) })
const post = (id: string) =>
  runSetup(
    new Request(`http://sands.test/api/worlds/${id}/setup`, { method: "POST" }),
    params(id)
  )

async function events(response: Response) {
  const text = await response.text()
  return text
    .split("\n")
    .filter(Boolean)
    .map((line) => setupEventSchema.parse(JSON.parse(line)))
}

describe("POST /api/worlds/[id]/setup", () => {
  it("streams setup for a Brief written in the UI and leaves the World in review with its Entries", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {})
    const world = createWorld(getDb(), {
      name: "Route World",
      briefDoc: londonBriefDocument("route"),
    })

    const response = await post(world.id)
    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toMatch(/ndjson/)
    const streamed = await events(response)
    expect(streamed[0]).toMatchObject({ type: "step", step: "parse" })
    expect(streamed.at(-1)).toMatchObject({
      type: "result",
      world: { setupStatus: "review" },
    })

    const read = getWorldResponseSchema.parse(
      await (
        await getWorld(new Request("http://sands.test"), params(world.id))
      ).json()
    )
    expect(read.world.setupStatus).toBe("review")
    expect(read.world.solvability?.passed).toBe(true)
    expect(new Set(read.entries.map((e) => e.status))).toEqual(
      new Set(["locked", "proposed"])
    )

    const again = await post(world.id)
    expect(again.status).toBe(409)
    expect(apiErrorBodySchema.parse(await again.json()).error.message).toMatch(
      /already run/
    )
  })

  it("refuses before streaming when the World is unknown or its Brief does not pass", async () => {
    expect((await post("w-missing")).status).toBe(404)
    const empty = createWorld(getDb(), { name: "Empty", briefDoc: [] })
    const response = await post(empty.id)
    expect(response.status).toBe(422)
  })
})
