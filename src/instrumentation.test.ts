import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { closeDb, getDb, openDatabase } from "@/db/client"
import { getWorld, updateWorld } from "@/db/worlds"
import { claimSetup } from "@/setup/run"
import { londonBriefDocument } from "@/test/london"
import { createWorld } from "@/worlds/worlds"

import { register } from "./instrumentation"

// A database file, so the server starting again opens what the last one left.
let folder: string
let url: string
const original = {
  url: process.env.DB_URL,
  runtime: process.env.NEXT_RUNTIME,
}

beforeEach(() => {
  folder = mkdtempSync(path.join(tmpdir(), "sands-start-"))
  url = path.join(folder, "sands.db")
  closeDb()
})

afterEach(() => {
  closeDb()
  process.env.DB_URL = original.url
  process.env.NEXT_RUNTIME = original.runtime
  rmSync(folder, { recursive: true, force: true })
})

describe("the server starting", () => {
  it("returns a World left drafting by a server that stopped mid-setup to draft, and touches no other World", async () => {
    const before = openDatabase(url)
    const interrupted = claimSetup(
      before,
      createWorld(before, {
        name: "Interrupted",
        briefDoc: londonBriefDocument("a"),
      }).id
    )
    const reviewed = createWorld(before, {
      name: "Reviewed",
      briefDoc: londonBriefDocument("b"),
    })
    updateWorld(before, { ...reviewed, setupStatus: "review" })
    const untouched = getWorld(before, reviewed.id)
    before.$client.close()

    process.env.DB_URL = url
    process.env.NEXT_RUNTIME = "nodejs"
    await register()
    const db = getDb()

    const released = getWorld(db, interrupted.id)
    expect(released.setupStatus).toBe("draft")
    expect(released.brief).toEqual(interrupted.brief)
    // The Author can run setup again.
    expect(claimSetup(db, interrupted.id).setupStatus).toBe("drafting")
    expect(getWorld(db, reviewed.id)).toEqual(untouched)
  })

  it("leaves the database closed in the edge runtime", async () => {
    process.env.DB_URL = url
    process.env.NEXT_RUNTIME = "edge"
    await register()
    expect(globalThis.__sandsDb).toBeUndefined()
  })
})
