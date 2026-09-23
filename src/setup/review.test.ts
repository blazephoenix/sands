import { describe, expect, it } from "vitest"

import type { Entry, EntryStatus } from "@/domain/entry"
import { londonEntries } from "@/fixtures/entries"
import { londonBrief } from "@/fixtures/worlds"

import { nextUndecided, reviewDecision, reviewProgress, reviewSections, whyDrafted } from "./review"

/**
 * What setup drafted for Whitechapel, 1888: 29 Entries. 6 are locked from the
 * Brief; of the other 23, Dr. Pryce is already accepted and Abberline
 * rejected; Tower Bridge, Walter Finch and Abberline carry Judge flags.
 */
const drafted = () => londonEntries("w", "wc", "review")

function withStatus(entries: Entry[], statuses: Record<string, EntryStatus>) {
  return entries.map((entry) => (statuses[entry.id] ? { ...entry, status: statuses[entry.id] } : entry)) as Entry[]
}

const ids = (entries: readonly Entry[]) => entries.map((entry) => entry.id.replace(/^wc-/u, ""))

describe("the Author's decision on an Entry, in the review's words", () => {
  it("maps proposed to undecided, accepted and edited to approved, rejected to removed, and keeps locked out", () => {
    expect(reviewDecision("proposed")).toBe("undecided")
    expect(reviewDecision("accepted")).toBe("approved")
    expect(reviewDecision("edited")).toBe("approved")
    expect(reviewDecision("rejected")).toBe("removed")
    expect(reviewDecision("locked")).toBeNull()
  })
})

describe("the sidebar's sections", () => {
  it("sets the Author's locked Entries aside and puts Judge-flagged undecided Entries first", () => {
    const sections = reviewSections(drafted())
    expect(ids(sections.locked)).toEqual(["jacob", "geoffrey", "amanda", "max", "yard", "exit-1"])
    expect(ids(sections.needsALook)).toEqual(["tower-bridge", "finch"])
    expect(ids(sections.approved)).toEqual(["pryce"])
    expect(ids(sections.removed)).toEqual(["abberline"])
  })

  it("orders To review World first, then Story logic, kind by kind", () => {
    expect(ids(reviewSections(drafted()).toReview)).toEqual([
      "whitechapel",
      "spitalfields",
      "docks",
      "nell",
      "josiah",
      "traders",
      "c1",
      "c2",
      "c3",
      "c4",
      "c5",
      "ledger",
      "exit-2",
      "exit-3",
      "k-nell",
      "k-pryce",
      "k-amanda",
      "k-josiah",
      "arrest-max",
    ])
  })

  it("moves a flagged Entry out of Needs a look once decided, keeping flagged Entries first in every section", () => {
    const sections = reviewSections(withStatus(drafted(), { "wc-finch": "accepted", "wc-tower-bridge": "rejected" }))
    expect(sections.needsALook).toEqual([])
    expect(ids(sections.approved)).toEqual(["finch", "pryce"])
    expect(ids(sections.removed)).toEqual(["tower-bridge", "abberline"])
  })
})

describe("progress", () => {
  it("counts reviewed, approved and removed among the Entries that need a decision", () => {
    expect(reviewProgress(drafted())).toEqual({ total: 23, reviewed: 2, approved: 1, removed: 1, undecided: 21 })
  })
})

describe("the next Entry after a decision", () => {
  it("is the next undecided Entry in list order, wrapping round, never the one just decided", () => {
    const entries = drafted()
    expect(nextUndecided(entries, "wc-tower-bridge")).toBe("wc-finch")
    expect(nextUndecided(entries, "wc-finch")).toBe("wc-whitechapel")
    expect(nextUndecided(entries, "wc-arrest-max")).toBe("wc-tower-bridge")
  })

  it("is null when nothing else is undecided", () => {
    const entries = drafted().map((entry) => (entry.status === "proposed" && entry.id !== "wc-c1" ? { ...entry, status: "accepted" } : entry)) as Entry[]
    expect(nextUndecided(entries, "wc-c1")).toBeNull()
  })
})

describe("why setup drafted an Entry", () => {
  const { brief } = londonBrief("wc")
  const why = (key: string, entries = drafted()) => whyDrafted(entries.find((entry) => entry.id === `wc-${key}`)!, { entries, brief })

  it("names the Decisive action a Clue is required for", () => {
    expect(why("c1")).toBe("Arrest Max Rober requires it.")
  })

  it("says when a Clue is a red herring", () => {
    expect(why("c5")).toBe("A red herring, to mislead the Player.")
  })

  it("names the Clues a Location holds", () => {
    expect(why("docks")).toBe("C2 is found here.")
    expect(why("whitechapel")).toBe("C5 is found here.")
  })

  it("names the Clues a character knows", () => {
    expect(why("nell")).toBe("Knows C3.")
  })

  it("says which Clue a piece of Knowledge makes reachable, and from whom", () => {
    expect(why("k-nell")).toBe("Makes C3 reachable by questioning Nell Garvey.")
  })

  it("names the Arc that lacked an Exit condition in the Brief", () => {
    expect(why("exit-2")).toBe("Arc 2, Midpoint, had no Exit condition in the Brief.")
  })

  it("derives a Decisive action from the Ending", () => {
    expect(why("arrest-max")).toBe("Derived from the Ending: The killer is caught and arrested.")
  })

  it("ignores rejected Entries when explaining, and says nothing when nothing applies", () => {
    const entries = withStatus(drafted(), { "wc-c2": "rejected" })
    expect(why("docks", entries)).toBeNull()
    expect(why("ledger")).toBeNull()
  })
})
