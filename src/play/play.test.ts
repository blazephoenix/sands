import { beforeEach, describe, expect, it } from "vitest"

import type { Db } from "@/db/client"
import { getSession, listTurns } from "@/db/sessions"
import { emptySkeleton } from "@/domain/skeleton"
import { FakeWriter } from "@/models/fake-writer"
import { hidden } from "@/skeleton/hidden-text"
import { testDb } from "@/test/db"
import { playableSkeleton } from "@/test/skeletons"
import { createWorld } from "@/worlds/worlds"

import {
  cleanChoices,
  cleanGlossary,
  mergeKnowledge,
  playTurn,
  resolveEnding,
  startSession,
} from "./play"

let db: Db
let worldId: string

beforeEach(async () => {
  db = await testDb()
  const skeleton = playableSkeleton()
  skeleton.story.premise = `Two people want ${hidden("the same key")}.`
  worldId = (await createWorld(db, { skeleton })).id
})

describe("starting a Session", () => {
  it("has the Writer write the Opening from the Skeleton, then stores both", async () => {
    const writer = new FakeWriter({ replies: ["The station hums."] })
    const { session, turns } = await startSession(db, writer, worldId)

    expect(turns).toHaveLength(1)
    expect(turns[0]).toMatchObject({
      index: 0,
      playerInput: null,
      passage: "The station hums.",
      choices: ["Go on", "Wait"],
      ending: null,
    })
    expect(await listTurns(db, session.id)).toEqual(turns)
    expect((await getSession(db, session.id)).skeleton).toEqual(
      session.skeleton
    )

    const [{ instructions, prompt }] = writer.calls
    expect(instructions).toContain("<hidden>")
    expect(prompt).toContain("Two people want <hidden>the same key</hidden>.")
    expect(prompt).toContain("Write the Opening.")
    expect(prompt).not.toContain("The story so far")
  })

  it("refuses a World whose Skeleton blocks play, before calling the Writer", async () => {
    const empty = await createWorld(db, { skeleton: emptySkeleton() })
    const writer = new FakeWriter()
    await expect(startSession(db, writer, empty.id)).rejects.toMatchObject({
      code: "conflict",
      message: expect.stringMatching(
        /can't be played yet\. The story needs a Title\./
      ),
    })
    expect(writer.calls).toHaveLength(0)
  })

  it("stores nothing when the Writer fails", async () => {
    const writer = new FakeWriter({ replies: [new Error("down")] })
    await expect(startSession(db, writer, worldId)).rejects.toThrow("down")
    const { listSessionSummaries } = await import("@/db/sessions")
    expect(await listSessionSummaries(db, worldId)).toEqual([])
  })
})

describe("playing a Turn", () => {
  it("gives the Writer the story so far and the Player's input, and stores the Turn", async () => {
    const writer = new FakeWriter({
      replies: ["The station hums.", "Ben looks away."],
    })
    const { session } = await startSession(db, writer, worldId)
    const { turn } = await playTurn(db, writer, session.id, "  Ask Ben  ")

    expect(turn).toMatchObject({ index: 1, playerInput: "Ask Ben" })
    expect(writer.calls[1].prompt).toContain("### Opening\n\nThe station hums.")
    expect(writer.calls[1].prompt).toMatch(
      /# This Turn\n\n\*\*The Player:\*\* Ask Ben$/
    )
    expect(await listTurns(db, session.id)).toHaveLength(2)
  })

  it("ends the Session on a listed Ending, with the Skeleton's Kind", async () => {
    const writer = new FakeWriter({
      replies: [
        "Opening.",
        {
          passage: "The key turns.",
          choices: ["Leave"],
          ending: { name: "found", kind: "neutral" },
          characterNotes: [],
          glossary: [],
        },
      ],
    })
    const { session } = await startSession(db, writer, worldId)
    const { turn, session: ended } = await playTurn(
      db,
      writer,
      session.id,
      "Turn the key"
    )

    expect(turn.ending).toEqual({
      name: "Found",
      kind: "good",
      invented: false,
    })
    expect(turn.choices).toEqual([])
    expect(turn.log.notes).toEqual([
      "The Writer called this Ending neutral; the Skeleton lists it as good, which is what was recorded.",
    ])
    expect((await getSession(db, session.id)).ending).toEqual(ended.ending)
    await expect(
      playTurn(db, writer, session.id, "Again")
    ).rejects.toMatchObject({ code: "conflict" })
  })

  it("refuses an empty input", async () => {
    const writer = new FakeWriter()
    const { session } = await startSession(db, writer, worldId)
    await expect(playTurn(db, writer, session.id, "   ")).rejects.toMatchObject(
      {
        code: "invalid",
      }
    )
  })

  it("refuses a second Turn with the same index, as from another tab", async () => {
    const writer = new FakeWriter()
    const { session } = await startSession(db, writer, worldId)
    const results = await Promise.allSettled([
      playTurn(db, writer, session.id, "One"),
      playTurn(db, writer, session.id, "Two"),
    ])
    expect(results.map((r) => r.status).sort()).toEqual([
      "fulfilled",
      "rejected",
    ])
    const rejected = results.find((r) => r.status === "rejected")
    expect(rejected?.reason).toMatchObject({ code: "conflict" })
  })
})

describe("resolveEnding", () => {
  it("goes on, with a note, when the Writer names an Ending the Skeleton doesn't list", () => {
    expect(
      resolveEnding(playableSkeleton(), { name: "Escape", kind: "good" })
    ).toEqual({
      ending: null,
      notes: [
        "The Writer ended on “Escape”, which the Skeleton doesn't list, and it may not invent Endings, so the Session goes on.",
      ],
    })
  })

  it("accepts an invented Ending when the Skeleton allows them", () => {
    const skeleton = { ...playableSkeleton(), writerMayInventEndings: true }
    expect(
      resolveEnding(skeleton, { name: "Escape", kind: "neutral" }).ending
    ).toEqual({
      name: "Escape",
      kind: "neutral",
      invented: true,
    })
  })
})

describe("cleanChoices", () => {
  it("trims, drops blanks and repeats, and keeps four at most", () => {
    expect(cleanChoices([" a ", "", "A", "b", "c", "d", "e"], false)).toEqual([
      "a",
      "b",
      "c",
      "d",
    ])
    expect(cleanChoices(["a"], true)).toEqual([])
  })
})

describe("what the Player character knows", () => {
  it("carries notes forward, replaces a character's entry, and matches aliases", () => {
    const skeleton = playableSkeleton()
    skeleton.characters[1].aliases = "The Rival"
    const first = mergeKnowledge(
      skeleton,
      [],
      [
        { character: "ada", knows: "Herself." },
        { character: "the rival", knows: "Guarded." },
      ]
    )
    expect(first.known).toEqual([
      { character: "Ada", knows: "Herself." },
      { character: "Ben", knows: "Guarded." },
    ])
    const second = mergeKnowledge(skeleton, first.known, [
      { character: "Ben", knows: "Guarded, and hiding a key." },
      { character: "Cyd", knows: "A stranger." },
    ])
    expect(second.known[1]).toEqual({
      character: "Ben",
      knows: "Guarded, and hiding a key.",
    })
    expect(second.log).toEqual([
      "The Writer noted “Cyd”, who isn't a Skeleton character, so the note was dropped.",
    ])
  })

  it("keeps each Turn's knowledge and gives the next Turn the latest", async () => {
    const writer = new FakeWriter({
      replies: [
        {
          passage: "Ben waits on the lino.",
          choices: ["Talk"],
          ending: null,
          characterNotes: [{ character: "Ben", knows: "Waiting." }],
          glossary: [
            { term: "lino", definition: "Linoleum floor covering." },
            { term: "tannoy", definition: "Not in this Passage." },
          ],
        },
        "Ben shrugs.",
      ],
    })
    const { session, turns } = await startSession(db, writer, worldId)
    expect(turns[0].known).toEqual([{ character: "Ben", knows: "Waiting." }])
    expect(turns[0].glossary).toEqual([
      { term: "lino", definition: "Linoleum floor covering." },
    ])
    const { turn } = await playTurn(db, writer, session.id, "Talk")
    expect(turn.known).toEqual(turns[0].known)
    expect(writer.calls[1].prompt).toContain("- **Ben:** Waiting.")
    expect(writer.calls[1].prompt).toContain("# Words already defined\n\nlino")
  })
})

describe("cleanGlossary", () => {
  it("keeps new words the Passage uses, once per Session", () => {
    expect(
      cleanGlossary(
        "The Lino shone.",
        [],
        [
          { term: "lino", definition: "Floor covering." },
          { term: "LINO", definition: "Again." },
          { term: "", definition: "x" },
        ]
      )
    ).toEqual([{ term: "lino", definition: "Floor covering." }])
  })
})
