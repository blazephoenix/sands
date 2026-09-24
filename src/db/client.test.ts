import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { claimSetup } from "@/setup/run"
import { londonBriefDocument } from "@/test/london"
import { createWorld } from "@/worlds/worlds"

import { closeDb, getDb, openDatabase } from "./client"
import { getWorld, updateWorld } from "./worlds"

// A database file, so a second open stands in for the server starting again.
let folder: string
let url: string
const originalUrl = process.env.DB_URL

beforeEach(() => {
  folder = mkdtempSync(path.join(tmpdir(), "sands-client-"))
  url = path.join(folder, "sands.db")
  closeDb()
})

afterEach(() => {
  closeDb()
  process.env.DB_URL = originalUrl
  rmSync(folder, { recursive: true, force: true })
})

describe("opening the server's database", () => {
  it("returns a World left drafting by a server that stopped mid-setup to draft, and touches no other World", () => {
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
    const db = getDb()

    const released = getWorld(db, interrupted.id)
    expect(released.setupStatus).toBe("draft")
    expect(released.brief).toEqual(interrupted.brief)
    // The Author can run setup again.
    expect(claimSetup(db, interrupted.id).setupStatus).toBe("drafting")
    expect(getWorld(db, reviewed.id)).toEqual(untouched)
  })
})
