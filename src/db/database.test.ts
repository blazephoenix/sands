import { beforeEach, describe, expect, it } from "vitest"

import type { Entry } from "@/domain/entry"
import type { Session } from "@/domain/session"
import { storeLondonWorld, testDb } from "@/test/db"
import { londonBrief, testTime } from "@/test/london"
import { openingTurn, playerTurn } from "@/test/turns"

import type { OpenDatabase } from "./client"
import { getEntry, insertEntries, listWorldEntries } from "./entries"
import { StoreError } from "./errors"
import { entries, turns, worlds } from "./schema"
import {
  getSession,
  getSessionView,
  insertSession,
  insertTurn,
  listSessionSummaries,
  listTurns,
  sqliteErrorCode,
  updateTurn,
} from "./sessions"
import { getWorld, insertWorld } from "./worlds"

let db: OpenDatabase

beforeEach(() => {
  db = testDb()
})

function session(id: string, worldId: string, minutes = 100): Session {
  return {
    id,
    worldId,
    mode: "harness",
    seed: 7,
    ending: "none",
    createdAt: testTime(minutes),
    updatedAt: testTime(minutes),
  }
}

/** A ready London World with one Session and a copy of the start Location in it. */
function playable() {
  storeLondonWorld(db, { id: "w", prefix: "mk", variant: "ready" })
  insertSession(db, session("s", "w"))
  const [yard] = insertEntries(db, [
    {
      ...getEntry(db, "mk-yard"),
      id: "s.mk-yard",
      sessionId: "s",
      templateId: "mk-yard",
    },
  ])
  return { yardId: yard.id }
}

/** Runs a raw statement and returns the SQLite error code it fails with. */
function failureOf(run: () => unknown): string | null {
  try {
    run()
  } catch (error) {
    return sqliteErrorCode(error)
  }
  return null
}

describe("the migrations", () => {
  it("create the four tables of spec §6, with foreign keys on", () => {
    const tables = db.$client
      .prepare(
        "select name from sqlite_master where type = 'table' and name not like '\\_\\_%' escape '\\' and name not like 'sqlite%' order by name"
      )
      .pluck()
      .all()
    expect(tables).toEqual(["entries", "sessions", "turns", "worlds"])
    expect(db.$client.pragma("foreign_keys", { simple: true })).toBe(1)
  })
})

describe("every row reads back exactly as written", () => {
  it("Worlds, with and without a validated Brief", () => {
    const { briefDoc, brief } = londonBrief("t")
    const full = {
      id: "w-full",
      name: "The Merchant Killings",
      briefDoc,
      brief,
      setupStatus: "review" as const,
      solvability: {
        passed: false,
        gaps: [
          {
            code: "arc_without_exit_condition" as const,
            message: "Arc 2 has no Exit condition.",
            entryId: null,
            arcIndex: 1,
          },
        ],
        checkedAt: testTime(5),
      },
      createdAt: testTime(0),
      updatedAt: testTime(5),
    }
    const draft = {
      ...full,
      id: "w-draft",
      brief: null,
      setupStatus: "draft" as const,
      solvability: null,
    }
    expect(insertWorld(db, full)).toEqual(full)
    expect(insertWorld(db, draft)).toEqual(draft)
    expect(getWorld(db, "w-full")).toEqual(full)
    expect(getWorld(db, "w-draft")).toEqual(draft)
  })

  it("Entries of all nine kinds, Session copies and play Entries with their seen time, in stored order", () => {
    const { entries: stored } = storeLondonWorld(db, {
      id: "w",
      prefix: "mk",
      variant: "ready",
    })
    const read = listWorldEntries(db, "w")
    expect(new Set(read.map((entry) => entry.kind)).size).toBe(9)
    expect(read).toEqual(stored)

    insertSession(db, session("s", "w"))
    const play: Entry = {
      id: "s.play-mrs-carrow",
      worldId: "w",
      sessionId: "s",
      templateId: null,
      kind: "npc",
      name: "Mrs Carrow",
      description: "The second victim's widow.",
      keyFacts: [],
      data: {
        role: "Widow",
        age: "",
        personality: "Guarded.",
        backstory: "",
        isPlayer: false,
        hiddenFields: [],
        aliases: [],
      },
      source: "play",
      sourceTurn: 3,
      status: "proposed",
      jevFlags: [],
      seenAt: testTime(200),
      createdAt: testTime(190),
      updatedAt: testTime(190),
    }
    insertEntries(db, [play])
    expect(getEntry(db, play.id)).toEqual(play)
  })

  it("Sessions and Turns, the Opening and a later Turn", () => {
    const { yardId } = playable()
    expect(getSession(db, "s")).toEqual(session("s", "w"))
    const opening = openingTurn("s", yardId)
    const first = playerTurn("s", 1, "I read the case file.", yardId)
    insertTurn(db, opening)
    insertTurn(db, first)
    expect(listTurns(db, "s")).toEqual([opening, first])
  })
})

describe("the database's own guards", () => {
  it("refuses a second Turn 0 for one Session", () => {
    const { yardId } = playable()
    const opening = openingTurn("s", yardId)
    const row = {
      id: opening.id,
      sessionId: "s",
      idx: 0,
      playerInput: null,
      passage: opening.passage,
      flagged: false,
      logJson: opening.log,
      stateJson: opening.state,
      backgroundStatus: "pending" as const,
      createdAt: opening.createdAt,
    }
    db.insert(turns).values(row).run()
    expect(
      failureOf(() =>
        db
          .insert(turns)
          .values({ ...row, id: "another-opening" })
          .run()
      )
    ).toBe("SQLITE_CONSTRAINT_UNIQUE")
    expect(listTurns(db, "s")).toHaveLength(1)
  })

  it("answers a conflict when a second Opening is saved", () => {
    const { yardId } = playable()
    insertTurn(db, openingTurn("s", yardId))
    expect(() =>
      insertTurn(db, { ...openingTurn("s", yardId), id: "second" })
    ).toThrow(/already had its Opening/)
    expect(listTurns(db, "s")).toHaveLength(1)
  })

  it("refuses a Player input on Turn 0 and a missing one after it", () => {
    const { yardId } = playable()
    const opening = openingTurn("s", yardId)
    const row = {
      id: "t",
      sessionId: "s",
      passage: opening.passage,
      flagged: false,
      logJson: opening.log,
      stateJson: opening.state,
      backgroundStatus: "pending" as const,
      createdAt: opening.createdAt,
    }
    expect(
      failureOf(() =>
        db
          .insert(turns)
          .values({ ...row, idx: 0, playerInput: "I arrive." })
          .run()
      )
    ).toBe("SQLITE_CONSTRAINT_CHECK")
    expect(
      failureOf(() =>
        db
          .insert(turns)
          .values({ ...row, idx: 1, playerInput: null })
          .run()
      )
    ).toBe("SQLITE_CONSTRAINT_CHECK")
  })

  it("refuses a World past draft without a Brief, and an Entry of an unknown World", () => {
    expect(
      failureOf(() =>
        db
          .insert(worlds)
          .values({
            id: "w",
            name: "",
            briefDoc: [],
            briefJson: null,
            setupStatus: "review",
            solvabilityJson: null,
            createdAt: testTime(0),
            updatedAt: testTime(0),
          })
          .run()
      )
    ).toBe("SQLITE_CONSTRAINT_CHECK")
    expect(
      failureOf(() =>
        db
          .insert(entries)
          .values({
            id: "e",
            worldId: "nowhere",
            sessionId: null,
            templateId: null,
            kind: "object",
            name: "",
            description: "",
            keyFacts: [],
            dataJson: {},
            source: "author",
            sourceTurn: null,
            status: "accepted",
            jevFlags: [],
            seenAt: null,
            createdAt: testTime(0),
            updatedAt: testTime(0),
          })
          .run()
      )
    ).toBe("SQLITE_CONSTRAINT_FOREIGNKEY")
  })
})

describe("saving Turns", () => {
  it("saves the Session's Ending with its Turn", () => {
    const { yardId } = playable()
    insertTurn(db, openingTurn("s", yardId))
    const last = playerTurn("s", 1, "I arrest Max Rober.", yardId)
    const won = {
      ...last,
      state: { ...last.state, ending: "win" as const },
      log: {
        ...last.log,
        outcome: {
          ...last.log.outcome!,
          kind: "decisive_success" as const,
          ending: "win" as const,
        },
      },
    }
    const saved = insertTurn(db, won)
    expect(saved.session).toMatchObject({
      ending: "win",
      updatedAt: won.createdAt,
    })
    expect(() =>
      insertTurn(db, playerTurn("s", 2, "I go home.", yardId))
    ).toThrow(/has ended/)
  })

  it("refuses a Turn that skips an index, or comes before the Opening", () => {
    const { yardId } = playable()
    const error = (() => {
      try {
        insertTurn(db, playerTurn("s", 1, "I read the file.", yardId))
      } catch (caught) {
        return caught
      }
    })()
    expect(error).toBeInstanceOf(StoreError)
    expect(error).toMatchObject({ code: "conflict" })
    expect(listTurns(db, "s")).toEqual([])
  })

  it("merges background results into a stored Turn", () => {
    const { yardId } = playable()
    const { turn } = insertTurn(db, openingTurn("s", yardId))
    const done = updateTurn(db, {
      ...turn,
      backgroundStatus: "done",
      log: {
        ...turn.log,
        background: {
          newEntryIds: [],
          arcCheck: [],
          arcAdvancedTo: null,
          pacing: null,
          error: null,
        },
      },
    })
    expect(listTurns(db, "s")).toEqual([done])
  })
})

describe("reading Sessions", () => {
  it("summarises a World's Sessions newest first, counting every Turn", () => {
    const { yardId } = playable()
    insertSession(db, session("s-2", "w", 300))
    insertTurn(db, openingTurn("s", yardId))
    insertTurn(db, playerTurn("s", 1, "I read the file.", yardId))
    expect(
      listSessionSummaries(db, "w").map(({ id, turnCount }) => ({
        id,
        turnCount,
      }))
    ).toEqual([
      { id: "s-2", turnCount: 0 },
      { id: "s", turnCount: 2 },
    ])
  })

  it("numbers a Session within its World, oldest first", () => {
    playable()
    insertSession(db, session("s-2", "w", 300))
    const view = getSessionView(db, "s-2")
    expect(view.sessionNumber).toBe(2)
    expect(view.world.id).toBe("w")
    expect(view.turns).toEqual([])
    expect(getSessionView(db, "s").entries.map((entry) => entry.id)).toEqual([
      "s.mk-yard",
    ])
  })

  it("answers not found for an unknown Session", () => {
    expect(() => getSessionView(db, "nope")).toThrow(StoreError)
  })
})
