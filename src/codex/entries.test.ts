import { beforeEach, describe, expect, it } from "vitest"

import type { OpenDatabase } from "@/db/client"
import { getEntry, listWorldEntries } from "@/db/entries"
import { StoreError } from "@/db/errors"
import { getWorld } from "@/db/worlds"
import { checkSolvability } from "@/setup/solvability"
import { storeLondonWorld, testDb } from "@/test/db"

import { createEntry, patchEntry } from "./entries"
import { copyId, startSession } from "@/sessions/start-session"
import { dayjs } from "@/lib/time"

let db: OpenDatabase

/** Whitechapel in review: setup's draft, where the arrest needs all of C1-C4. */
const REVIEW = "w-review"
/** The Merchant Killings, reviewed: the arrest needs any three of C1-C4. */
const READY = "w-ready"
const C2 = "wc-c2"

beforeEach(() => {
  db = testDb()
  storeLondonWorld(db, { id: REVIEW, prefix: "wc", variant: "review" })
  storeLondonWorld(db, { id: READY, prefix: "mk", variant: "ready" })
})

describe("the Author's decisions on an Entry", () => {
  it("accepts, rejects and restores, storing each", () => {
    expect(patchEntry(db, C2, { action: "accept" }).entry.status).toBe(
      "accepted"
    )
    expect(getEntry(db, C2).status).toBe("accepted")
    expect(patchEntry(db, C2, { action: "reject" }).entry.status).toBe(
      "rejected"
    )
    expect(getEntry(db, C2).status).toBe("rejected")
    const restored = patchEntry(db, C2, {
      action: "restore",
      status: "proposed",
    })
    expect(restored.entry.status).toBe("proposed")
    expect(getEntry(db, C2)).toEqual(restored.entry)
  })

  it("edits content, marks the Entry edited and stores it", () => {
    const { entry } = patchEntry(db, "wc-traders", {
      action: "edit",
      content: {
        kind: "faction",
        name: "The Traders",
        description: "Changed.",
        keyFacts: ["Founded: 1851"],
        data: {},
      },
    })
    expect(entry).toMatchObject({
      name: "The Traders",
      description: "Changed.",
      keyFacts: ["Founded: 1851"],
      status: "edited",
    })
    expect(getEntry(db, "wc-traders")).toEqual(entry)
  })

  it("refuses a locked Entry, and an edit of another kind, changing nothing", () => {
    const before = getWorld(db, REVIEW)
    expect(() => patchEntry(db, "wc-yard", { action: "reject" })).toThrow(
      expect.objectContaining({ code: "conflict" })
    )
    expect(() =>
      patchEntry(db, C2, {
        action: "edit",
        content: {
          kind: "faction",
          name: "",
          description: "",
          keyFacts: [],
          data: {},
        },
      })
    ).toThrow(expect.objectContaining({ code: "invalid" }))
    expect(getEntry(db, "wc-yard").status).toBe("locked")
    expect(getWorld(db, REVIEW)).toEqual(before)
  })

  it("answers not found for an unknown Entry", () => {
    expect(() => patchEntry(db, "nope", { action: "accept" })).toThrow(
      StoreError
    )
  })
})

describe("solvability after every change to a World Entry (spec §7.2, §8 step 4)", () => {
  it("rejecting a required Clue fails the World, naming the Clue, and restoring it passes again", () => {
    const rejected = patchEntry(db, C2, { action: "reject" })
    expect(rejected.solvability).toMatchObject({
      passed: false,
      gaps: [{ code: "missing_clue", entryId: C2 }],
    })
    expect(rejected.solvability?.gaps[0].message).toContain("C2")
    expect(getWorld(db, REVIEW).solvability).toEqual(rejected.solvability)

    const restored = patchEntry(db, C2, {
      action: "restore",
      status: "proposed",
    })
    expect(restored.solvability).toMatchObject({ passed: true, gaps: [] })
    expect(getWorld(db, REVIEW).solvability).toEqual(restored.solvability)
  })

  it("counts Clues needed: the ready World's arrest takes any three of its four Clues", () => {
    expect(
      patchEntry(db, "mk-c2", { action: "reject" }).solvability
    ).toMatchObject({ passed: true, gaps: [] })
    const { solvability } = patchEntry(db, "mk-c3", { action: "reject" })
    expect(solvability?.passed).toBe(false)
    expect(solvability?.gaps.map((gap) => gap.entryId)).toEqual([
      "mk-c2",
      "mk-c3",
    ])
  })

  it("stamps each result with the time it was checked", () => {
    const before = getWorld(db, REVIEW).solvability!.checkedAt
    const { solvability } = patchEntry(db, C2, { action: "accept" })
    expect(dayjs(solvability!.checkedAt).valueOf()).toBeGreaterThan(
      dayjs(before).valueOf()
    )
  })

  it("re-checks an edit against the edited content", () => {
    const clue = getEntry(db, C2)
    if (clue.kind !== "clue") throw new Error("wc-c2 is a Clue")
    const { entry, solvability } = patchEntry(db, C2, {
      action: "edit",
      content: {
        kind: "clue",
        name: clue.name,
        description: clue.description,
        keyFacts: clue.keyFacts,
        data: { ...clue.data, redHerring: true },
      },
    })
    expect(entry.status).toBe("edited")
    expect(solvability).toMatchObject({
      passed: false,
      gaps: [{ code: "red_herring_required", entryId: C2 }],
    })
  })

  it("re-checks when the Author adds an Entry, so a new Exit condition can close an Arc's gap", () => {
    expect(
      patchEntry(db, "wc-exit-2", { action: "reject" }).solvability
    ).toMatchObject({
      passed: false,
      gaps: [{ code: "arc_without_exit_condition", arcIndex: 1 }],
    })
    const { entry, solvability } = createEntry(db, {
      worldId: REVIEW,
      sessionId: null,
      content: {
        kind: "exit_condition",
        name: "Trade learned",
        description: "",
        keyFacts: [],
        data: { arcIndex: 1, condition: "Jacob knows the trade." },
      },
    })
    expect(entry).toMatchObject({ source: "author", status: "accepted" })
    expect(getEntry(db, entry.id)).toEqual(entry)
    expect(solvability).toMatchObject({ passed: true, gaps: [] })
    expect(getWorld(db, REVIEW).solvability?.passed).toBe(true)
  })

  it("returns the stored result unchanged for mark-seen", () => {
    const before = getWorld(db, REVIEW).solvability
    expect(patchEntry(db, C2, { action: "mark-seen" }).solvability).toEqual(
      before
    )
  })

  it("stores what the real check gives", () => {
    patchEntry(db, "wc-c4", { action: "reject" })
    const world = getWorld(db, REVIEW)
    const { passed, gaps } = world.solvability!
    expect({ passed, gaps }).toEqual(
      checkSolvability({
        arcs: world.brief!.arcs,
        entries: listWorldEntries(db, REVIEW),
      })
    )
  })
})

describe("changes to a Session's Codex", () => {
  it("leave the World's result alone and answer null", () => {
    const { session } = startSession(db, { worldId: READY, mode: "harness" })
    const before = getWorld(db, READY)
    const copy = copyId(session.id, "mk-c2")
    expect(patchEntry(db, copy, { action: "reject" }).solvability).toBeNull()
    expect(getWorld(db, READY)).toEqual(before)
    expect(getEntry(db, "mk-c2").status).toBe("accepted")
  })

  it("record when the Author first saw an Entry, once", () => {
    const { session } = startSession(db, { worldId: READY, mode: "harness" })
    const copy = copyId(session.id, "mk-nell")
    const seen = patchEntry(db, copy, { action: "mark-seen" }).entry.seenAt
    expect(seen).not.toBeNull()
    expect(patchEntry(db, copy, { action: "mark-seen" }).entry.seenAt).toBe(
      seen
    )
    expect(getEntry(db, copy).seenAt).toBe(seen)
  })

  it("add an Author Entry to one Session only", () => {
    const { session } = startSession(db, { worldId: READY, mode: "harness" })
    const { entry, solvability } = createEntry(db, {
      worldId: READY,
      sessionId: session.id,
      content: {
        kind: "object",
        name: "A lantern",
        description: "",
        keyFacts: [],
        data: {},
      },
    })
    expect(solvability).toBeNull()
    expect(entry.sessionId).toBe(session.id)
    expect(listWorldEntries(db, READY).map((e) => e.id)).not.toContain(entry.id)
  })

  it("refuse a Session of another World", () => {
    const { session } = startSession(db, { worldId: READY, mode: "harness" })
    expect(() =>
      createEntry(db, {
        worldId: REVIEW,
        sessionId: session.id,
        content: {
          kind: "object",
          name: "",
          description: "",
          keyFacts: [],
          data: {},
        },
      })
    ).toThrow(expect.objectContaining({ code: "not_found" }))
  })
})
