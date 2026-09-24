import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"

import { afterAll, beforeAll, describe, expect, it } from "vitest"

import {
  createWorldResponseSchema,
  getWorldResponseSchema,
  listWorldsResponseSchema,
  saveBriefResponseSchema,
} from "@/domain/api"
import { closeDb } from "@/db/client"
import { londonBriefDocument } from "@/test/london"

import { PUT } from "./[id]/brief/route"
import { GET as getWorld } from "./[id]/route"
import { GET as listWorlds, POST as createWorld } from "./route"

// A database file, so closing and reopening it stands in for a server restart.
let folder: string
const originalUrl = process.env.DB_URL

beforeAll(() => {
  folder = mkdtempSync(path.join(tmpdir(), "sands-restart-"))
  process.env.DB_URL = path.join(folder, "sands.db")
  closeDb()
})

afterAll(() => {
  closeDb()
  process.env.DB_URL = originalUrl
  rmSync(folder, { recursive: true, force: true })
})

const params = (id: string) => ({ params: Promise.resolve({ id }) })

function json(method: string, url: string, body: unknown) {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("a World written through the routes survives a restart", () => {
  it("reads back exactly as left after the database is closed and reopened", async () => {
    const created = await createWorld(
      json("POST", "http://sands.test/api/worlds", { name: "" })
    )
    expect(created.status).toBe(201)
    const { world } = createWorldResponseSchema.parse(await created.json())

    const saved = await PUT(
      json("PUT", `http://sands.test/api/worlds/${world.id}/brief`, {
        name: "The Merchant Killings",
        briefDoc: londonBriefDocument("r"),
      }),
      params(world.id)
    )
    expect(saved.status).toBe(200)
    const { world: written } = saveBriefResponseSchema.parse(await saved.json())
    expect(written.brief).not.toBeNull()

    closeDb() // the server stops; the next request opens the file again

    const reopened = getWorldResponseSchema.parse(
      await (
        await getWorld(
          new Request(`http://sands.test/api/worlds/${world.id}`),
          params(world.id)
        )
      ).json()
    )
    expect(reopened).toEqual({ world: written, entries: [], sessions: [] })

    const { worlds } = listWorldsResponseSchema.parse(
      await (await listWorlds()).json()
    )
    expect(worlds.map((w) => w.name)).toEqual(["The Merchant Killings"])
  })

  it("answers 404 for an unknown World", async () => {
    const response = await getWorld(
      new Request("http://sands.test/api/worlds/nope"),
      params("nope")
    )
    expect(response.status).toBe(404)
    expect((await response.json()).error.code).toBe("not_found")
  })
})
