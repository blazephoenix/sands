import { beforeEach, describe, expect, it } from "vitest"

import type { OpenDatabase } from "@/db/client"
import { listSessionEntries, listWorldEntries } from "@/db/entries"
import { getSession } from "@/db/sessions"
import { getWorld } from "@/db/worlds"
import { referencedEntryIds } from "@/domain/entry"
import { storeLondonWorld, testDb } from "@/test/db"
import { createWorld } from "@/worlds/worlds"
import { patchEntry } from "@/codex/entries"

import { startSession } from "./start-session"

let db: OpenDatabase

const READY = "w-ready"
const REVIEW = "w-review"

beforeEach(() => {
  db = testDb()
  storeLondonWorld(db, { id: READY, prefix: "mk", variant: "ready" })
  storeLondonWorld(db, { id: REVIEW, prefix: "wc", variant: "review" })
})

describe("starting a Session", () => {
  it("copies every Template Entry that is not removed, and stores the Session with them", () => {
    const templates = listWorldEntries(db, READY)
    const { session, entries } = startSession(db, {
      worldId: READY,
      mode: "harness",
    })
    const live = templates.filter((entry) => entry.status !== "rejected")
    expect(live.length).toBeLessThan(templates.length)
    expect(entries.map((entry) => entry.templateId)).toEqual(
      live.map((entry) => entry.id)
    )
    expect(
      entries.every(
        (entry) => entry.sessionId === session.id && entry.worldId === READY
      )
    ).toBe(true)
    expect(getSession(db, session.id)).toEqual(session)
    expect(listSessionEntries(db, session.id)).toEqual(entries)
  })

  it("points references between copies at the copies, and leaves a reference to a removed Entry as it was", () => {
    const { entries } = startSession(db, { worldId: READY, mode: "harness" })
    const copyIds = new Set(entries.map((entry) => entry.id))
    const removed = new Set(
      listWorldEntries(db, READY)
        .filter((entry) => entry.status === "rejected")
        .map((entry) => entry.id)
    )
    const references = entries.flatMap(referencedEntryIds)
    expect(references.filter((id) => !copyIds.has(id))).toEqual([
      "mk-tower-bridge",
    ])
    expect(removed.has("mk-tower-bridge")).toBe(true)

    const arrest = entries.find((entry) => entry.kind === "decisive_action")!
    if (arrest.kind !== "decisive_action") throw new Error("not an action")
    const byId = new Map(entries.map((entry) => [entry.id, entry]))
    expect(byId.get(arrest.data.correctTargetId)?.name).toBe("Max Rober")
    expect(arrest.data.requires.map((id) => byId.get(id)?.templateId)).toEqual([
      "mk-c1",
      "mk-c2",
      "mk-c3",
      "mk-c4",
    ])
  })

  it("keeps a Session's copies as they were when World Entries change later", () => {
    const { session } = startSession(db, { worldId: READY, mode: "harness" })
    patchEntry(db, "mk-traders", {
      action: "edit",
      content: {
        kind: "faction",
        name: "Renamed",
        description: "",
        keyFacts: [],
        data: {},
      },
    })
    expect(
      listSessionEntries(db, session.id).find(
        (entry) => entry.templateId === "mk-traders"
      )?.name
    ).toBe("The Eastcheap Traders' Association")
  })

  it("starts two Sessions of one World with the same Codex", () => {
    /** A Session's Codex with its own id and times taken out. */
    const codex = ({ session, entries }: ReturnType<typeof startSession>) =>
      entries.map((entry) =>
        JSON.stringify({ ...entry, createdAt: "", updatedAt: "" }).replaceAll(
          session.id,
          "S"
        )
      )
    expect(
      codex(startSession(db, { worldId: READY, mode: "harness" }))
    ).toEqual(codex(startSession(db, { worldId: READY, mode: "harness" })))
  })

  it("moves a World in review to ready", () => {
    startSession(db, { worldId: REVIEW, mode: "harness" })
    expect(getWorld(db, REVIEW).setupStatus).toBe("ready")
  })

  it("refuses a World that has not finished setup", () => {
    const draft = createWorld(db, { name: "" })
    expect(() =>
      startSession(db, { worldId: draft.id, mode: "harness" })
    ).toThrow(/not finished setup/)
  })

  it("refuses a World that is not solvable, naming the first gap", () => {
    patchEntry(db, "wc-c2", { action: "reject" })
    expect(() =>
      startSession(db, { worldId: REVIEW, mode: "harness" })
    ).toThrow(/not solvable yet: .*C2/)
    expect(getWorld(db, REVIEW).setupStatus).toBe("review")
  })

  it("uses the seed it is given, so a Replay can reproduce its Outcomes", () => {
    const { session } = startSession(db, {
      worldId: READY,
      mode: "harness",
      seed: 42,
    })
    expect(session.seed).toBe(42)
  })
})
