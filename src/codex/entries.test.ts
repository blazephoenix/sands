import { beforeEach, describe, expect, it } from "vitest"

import type { OpenDatabase } from "@/db/client"
import { getEntry, listWorldEntries, updateEntry } from "@/db/entries"
import { StoreError } from "@/db/errors"
import { insertTurn, listTurns } from "@/db/sessions"
import { getWorld } from "@/db/worlds"
import { getSessionView } from "@/sessions/session-view"
import { openingTurn } from "@/test/turns"
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

  it("removing the start Location fails the World and blocks Start, and restoring it passes again", () => {
    // A World whose Brief had no Location: setup drafted the start Location.
    const yard = "wc-yard"
    updateEntry(db, {
      ...getEntry(db, yard),
      source: "setup",
      status: "proposed",
    })

    const removed = patchEntry(db, yard, { action: "reject" })
    expect(removed.solvability?.passed).toBe(false)
    expect(removed.solvability?.gaps[0]).toEqual({
      code: "no_start_location",
      message:
        "There is no start Location: the Player has nowhere to begin. Restore Scotland Yard, or set Start location to yes on another Location.",
      entryId: yard,
      arcIndex: null,
    })
    expect(() =>
      startSession(db, { worldId: REVIEW, mode: "harness" })
    ).toThrow(/no start Location/)

    const restored = patchEntry(db, yard, {
      action: "restore",
      status: "proposed",
    })
    expect(restored.solvability).toMatchObject({ passed: true, gaps: [] })
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
  it("leave the World's result alone and answer the Session's own", () => {
    const { session } = startSession(db, { worldId: READY, mode: "harness" })
    const before = getWorld(db, READY)
    const copy = copyId(session.id, "mk-c2")
    expect(patchEntry(db, copy, { action: "reject" }).solvability).toEqual({
      passed: true,
      gaps: [],
      checkedAt: expect.any(String),
    })
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
    expect(solvability?.passed).toBe(true)
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

describe("Codex edits in play (spec §7.2)", () => {
  /** A Session of the ready World whose latest Turn leaves the Player at `location`, having found `found`. */
  function inPlay(location: string, found: string[] = []) {
    const { session } = startSession(db, { worldId: READY, mode: "harness" })
    const at = (key: string) => copyId(session.id, `mk-${key}`)
    const opening = openingTurn(session.id, at(location))
    insertTurn(db, {
      ...opening,
      state: { ...opening.state, cluesFound: found.map(at) },
    })
    return { session, at }
  }

  it("re-checks the Session's Solvability on every edit and shows a Gap, but still saves the edit", () => {
    const { session, at } = inPlay("yard")
    // The arrest needs any three of C1-C4.
    expect(
      patchEntry(db, at("c2"), { action: "reject" }).solvability?.passed
    ).toBe(true)

    const { entry, solvability } = patchEntry(db, at("c4"), {
      action: "reject",
    })

    expect(entry.status).toBe("rejected")
    expect(getEntry(db, at("c4")).status).toBe("rejected")
    expect(solvability?.passed).toBe(false)
    expect(solvability?.gaps.map((gap) => gap.entryId)).toEqual([
      at("c2"),
      at("c4"),
    ])
    expect(solvability?.gaps[1].message).toMatch(/C4/)
    expect(getSessionView(db, session.id).solvability).toMatchObject({
      passed: false,
      gaps: solvability?.gaps,
    })
  })

  it("keeps a Clue already found: it stays found, and still counts towards a Decisive action", () => {
    const { session, at } = inPlay("yard", ["c2"])
    patchEntry(db, at("c4"), { action: "reject" })

    const { solvability } = patchEntry(db, at("c2"), { action: "reject" })

    expect(solvability?.passed).toBe(true)
    expect(listTurns(db, session.id).at(-1)?.state.cluesFound).toEqual([
      at("c2"),
    ])
  })

  it("refuses to remove the Location the Player stands in, saying why, and changes nothing", () => {
    const { at } = inPlay("whitechapel")

    expect(() =>
      patchEntry(db, at("whitechapel"), { action: "reject" })
    ).toThrow(
      expect.objectContaining({
        code: "conflict",
        message: expect.stringMatching(
          /The Player is at Whitechapel High Street/
        ),
      })
    )
    expect(getEntry(db, at("whitechapel")).status).toBe("accepted")
  })

  it("reaches Clues from where the Player stands, not from the start Location", () => {
    // At the Docks, C2 lies where the Player stands. From Scotland Yard, only
    // Whitechapel led there, so removing it would leave two of three Clues.
    const { at } = inPlay("docks")

    const { entry, solvability } = patchEntry(db, at("whitechapel"), {
      action: "reject",
    })

    expect(entry.status).toBe("rejected")
    expect(solvability).toMatchObject({ passed: true, gaps: [] })
  })
})
