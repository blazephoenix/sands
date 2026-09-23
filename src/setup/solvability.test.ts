import { describe, expect, it } from "vitest"

import type { Entry, EntryData, EntryKind, EntryStatus } from "@/domain/entry"

import { checkSolvability } from "./solvability"

const AT = "2026-09-21T09:00:00.000Z"

function entry<K extends EntryKind>(
  kind: K,
  id: string,
  name: string,
  data: EntryData<K>,
  status: EntryStatus = "proposed"
): Entry {
  return {
    id,
    worldId: "w",
    sessionId: null,
    templateId: null,
    kind,
    name,
    description: "",
    keyFacts: [],
    data,
    source: "setup",
    sourceTurn: null,
    status,
    jevFlags: [],
    seenAt: null,
    createdAt: AT,
    updatedAt: AT,
  } as Entry
}

const person = {
  role: "",
  age: "",
  personality: "",
  backstory: "",
  isPlayer: false,
  hiddenFields: [],
  aliases: [],
}

/**
 * A small solvable World: the Yard (start) connects to Whitechapel, which
 * connects to the Docks. C1 lies at the Docks, two hops from the start; C2 is
 * held by Nell, who reveals it at normal Band. Arrest Max needs both.
 */
function world(overrides: Entry[] = []) {
  const base = [
    entry(
      "location",
      "yard",
      "Scotland Yard",
      { connections: ["whitechapel"], isStart: true },
      "locked"
    ),
    entry("location", "whitechapel", "Whitechapel High Street", {
      connections: ["yard", "docks"],
      isStart: false,
    }),
    entry("location", "docks", "St Katharine Docks", {
      connections: ["whitechapel"],
      isStart: false,
    }),
    entry("character", "max", "Max Rober", person, "locked"),
    entry("npc", "nell", "Nell Garvey", person),
    entry("clue", "c1", "C1 — A torn ledger page", {
      locationId: "docks",
      knownBy: [],
      reveals: "",
      pointsToHidden: true,
      redHerring: false,
    }),
    entry("clue", "c2", "C2 — The young clerk at dawn", {
      locationId: null,
      knownBy: ["nell"],
      reveals: "",
      pointsToHidden: true,
      redHerring: false,
    }),
    entry("knowledge", "k-nell", "Nell saw the clerk", {
      characterId: "nell",
      fact: "",
      minBand: "normal",
      clueId: "c2",
    }),
    entry(
      "exit_condition",
      "exit-1",
      "Case file read",
      { arcIndex: 0, condition: "Read the case file." },
      "locked"
    ),
    entry("exit_condition", "exit-2", "Max Rober arrested", {
      arcIndex: 1,
      condition: "Max Rober is arrested.",
    }),
    entry("decisive_action", "arrest", "Arrest Max Rober", {
      verb: "arrest",
      correctTargetId: "max",
      requires: ["c1", "c2"],
      requiresCount: null,
      onSuccess: "win",
      wrongTargetPenalty: 15,
      prematurePenalty: 20,
    }),
  ]
  const replaced = new Map(overrides.map((e) => [e.id, e]))
  return {
    arcs: [{ name: "Introduction" }, { name: "End" }],
    entries: [
      ...base.map((e) => replaced.get(e.id) ?? e),
      ...overrides.filter((e) => !base.some((b) => b.id === e.id)),
    ],
  }
}

function withStatus(
  input: ReturnType<typeof world>,
  id: string,
  status: EntryStatus
) {
  return {
    ...input,
    entries: input.entries.map((e) =>
      e.id === id ? { ...e, status } : e
    ) as Entry[],
  }
}

function patchData<K extends EntryKind>(
  input: ReturnType<typeof world>,
  id: string,
  data: Partial<EntryData<K>>
) {
  return {
    ...input,
    entries: input.entries.map((e) =>
      e.id === id ? { ...e, data: { ...e.data, ...data } } : e
    ) as Entry[],
  }
}

describe("checkSolvability (spec §8 step 3)", () => {
  it("passes when every required Clue exists, is real and is reachable, and every Arc has an Exit condition", () => {
    expect(checkSolvability(world())).toEqual({ passed: true, gaps: [] })
  })
})

describe("a Decisive action's required Clues", () => {
  it("fails on a required Clue the Author rejected, naming the Clue and linking to it", () => {
    const { passed, gaps } = checkSolvability(
      withStatus(world(), "c2", "rejected")
    )
    expect(passed).toBe(false)
    expect(gaps).toEqual([
      {
        code: "missing_clue",
        message:
          "Arrest Max Rober requires C2, which was removed. Restore C2 or remove it from Requires.",
        entryId: "c2",
        arcIndex: null,
      },
    ])
  })

  it("fails on a required Clue that is a red herring", () => {
    const { gaps } = checkSolvability(
      patchData(world(), "c1", { redHerring: true, pointsToHidden: false })
    )
    expect(gaps).toEqual([
      {
        code: "red_herring_required",
        message:
          "Arrest Max Rober requires C1, which is a red herring. Set its Red herring to no, or remove C1 from Requires.",
        entryId: "c1",
        arcIndex: null,
      },
    ])
  })

  it("fails on a required Clue that does not exist, linking to the Decisive action", () => {
    const { gaps } = checkSolvability(
      patchData(world(), "arrest", { requires: ["c1", "c2", "gone"] })
    )
    expect(gaps).toEqual([
      {
        code: "missing_clue",
        message:
          "Arrest Max Rober requires a Clue that does not exist. Remove it from Requires.",
        entryId: "arrest",
        arcIndex: null,
      },
    ])
  })
})

describe("reaching a Clue by Location", () => {
  it("fails on a required Clue at a Location no path of connections reaches from the start", () => {
    const input = world([
      entry("location", "bridge", "Tower Bridge", {
        connections: [],
        isStart: false,
      }),
      entry("clue", "c1", "C1 — A torn ledger page", {
        locationId: "bridge",
        knownBy: [],
        reveals: "",
        pointsToHidden: true,
        redHerring: false,
      }),
    ])
    expect(checkSolvability(input).gaps).toEqual([
      {
        code: "unreachable_clue",
        message:
          "C1 sits at an unreachable location: no connections lead from Scotland Yard to Tower Bridge.",
        entryId: "c1",
        arcIndex: null,
      },
    ])
  })

  it("follows connections in both directions, whichever Location lists them", () => {
    const input = patchData(world(), "whitechapel", { connections: ["yard"] })
    expect(checkSolvability(input).passed).toBe(true)
  })

  it("does not pass through a rejected Location", () => {
    const { gaps } = checkSolvability(
      withStatus(world(), "whitechapel", "rejected")
    )
    expect(gaps.map((g) => [g.code, g.entryId, g.message])).toEqual([
      [
        "unreachable_clue",
        "c1",
        "C1 sits at an unreachable location: no connections lead from Scotland Yard to St Katharine Docks.",
      ],
    ])
  })

  it("fails on a required Clue at a rejected Location", () => {
    const { gaps } = checkSolvability(withStatus(world(), "docks", "rejected"))
    expect(gaps.map((g) => [g.code, g.entryId, g.message])).toEqual([
      [
        "unreachable_clue",
        "c1",
        "C1 sits at St Katharine Docks, which was removed.",
      ],
    ])
  })

  it("fails when no live Location is the start location", () => {
    const { gaps } = checkSolvability(
      patchData(world(), "yard", { isStart: false })
    )
    expect(gaps.map((g) => [g.code, g.entryId, g.message])).toEqual([
      [
        "unreachable_clue",
        "c1",
        "C1 sits at St Katharine Docks, but no Location is the start location. Set Start location to yes on one.",
      ],
    ])
  })
})

describe("reaching a Clue through the people who know it", () => {
  it("fails on a required Clue whose holder reveals it only at high Band", () => {
    const { gaps } = checkSolvability(
      patchData(world(), "k-nell", { minBand: "high" })
    )
    expect(gaps).toEqual([
      {
        code: "clue_revealed_too_late",
        message:
          "C2 is revealed only at high Band, by Nell Garvey. Required Clues must be revealed at normal Band or lower.",
        entryId: "c2",
        arcIndex: null,
      },
    ])
  })

  it("accepts a holder who reveals it at low Band", () => {
    expect(
      checkSolvability(patchData(world(), "k-nell", { minBand: "low" })).passed
    ).toBe(true)
  })

  it("fails when the only Knowledge that reveals it is rejected", () => {
    const { gaps } = checkSolvability(withStatus(world(), "k-nell", "rejected"))
    expect(gaps.map((g) => [g.code, g.entryId, g.message])).toEqual([
      [
        "unreachable_clue",
        "c2",
        "C2 is known by Nell Garvey, but no Knowledge reveals it. Add Knowledge that reveals C2 at normal Band or lower.",
      ],
    ])
  })

  it("fails when the only person who reveals it is rejected", () => {
    const { gaps } = checkSolvability(withStatus(world(), "nell", "rejected"))
    expect(gaps.map((g) => [g.code, g.entryId, g.message])).toEqual([
      [
        "unreachable_clue",
        "c2",
        "C2 is revealed only by Nell Garvey, who was removed.",
      ],
    ])
  })

  it("fails on a required Clue that is neither at a Location nor known by anyone", () => {
    const input = withStatus(
      patchData(world(), "c2", { knownBy: [] }),
      "k-nell",
      "rejected"
    )
    expect(
      checkSolvability(input).gaps.map((g) => [g.code, g.entryId, g.message])
    ).toEqual([
      [
        "unreachable_clue",
        "c2",
        "C2 is neither at a Location nor known by anyone. Set its Found at or Known by.",
      ],
    ])
  })

  it("is reachable by either route: a reachable Location makes up for a high-Band holder", () => {
    const input = patchData(
      patchData(world(), "k-nell", { minBand: "high" }),
      "c2",
      { locationId: "whitechapel" }
    )
    expect(checkSolvability(input).passed).toBe(true)
  })
})

describe("Arcs", () => {
  it("fails on an Arc with no Exit condition, pointing at the Arc", () => {
    const input = {
      ...world(),
      arcs: [{ name: "Introduction" }, { name: "Midpoint" }, { name: "End" }],
    }
    const moved = patchData(input, "exit-2", { arcIndex: 2 })
    expect(checkSolvability(moved).gaps).toEqual([
      {
        code: "arc_without_exit_condition",
        message:
          "Arc 2, Midpoint, has no Exit condition. Add an Exit condition for Arc 2.",
        entryId: null,
        arcIndex: 1,
      },
    ])
  })

  it("does not count a rejected Exit condition, and points at it so the Author can restore it", () => {
    expect(
      checkSolvability(withStatus(world(), "exit-2", "rejected")).gaps
    ).toEqual([
      {
        code: "arc_without_exit_condition",
        message:
          "Arc 2, End, has no Exit condition. Restore Max Rober arrested, or add an Exit condition for Arc 2.",
        entryId: "exit-2",
        arcIndex: 1,
      },
    ])
  })
})

describe("the gap list", () => {
  it("lists every gap, Decisive actions first, then Arcs", () => {
    const input = withStatus(
      withStatus(
        patchData(world(), "c1", { redHerring: true }),
        "c2",
        "rejected"
      ),
      "exit-1",
      "rejected"
    )
    expect(
      checkSolvability(input).gaps.map((g) => [g.code, g.entryId ?? g.arcIndex])
    ).toEqual([
      ["red_herring_required", "c1"],
      ["missing_clue", "c2"],
      ["arc_without_exit_condition", "exit-1"],
    ])
  })

  it("ignores rejected Decisive actions", () => {
    expect(
      checkSolvability(
        withStatus(withStatus(world(), "c2", "rejected"), "arrest", "rejected")
      ).passed
    ).toBe(true)
  })
})

describe("Clues needed (requires_count, spec §6)", () => {
  /** Arrest Max needs any 2 of C1, C2 and C3; C3 lies at the Yard. */
  function twoOfThree() {
    const input = world([
      entry("clue", "c3", "C3 — A cufflink", {
        locationId: "yard",
        knownBy: [],
        reveals: "",
        pointsToHidden: true,
        redHerring: false,
      }),
    ])
    return patchData(input, "arrest", {
      requires: ["c1", "c2", "c3"],
      requiresCount: 2,
    })
  }

  it("passes while at least n of the listed Clues are usable", () => {
    expect(
      checkSolvability(withStatus(twoOfThree(), "c2", "rejected"))
    ).toEqual({ passed: true, gaps: [] })
  })

  it("fails when fewer than n are usable, naming each unusable Clue and the shortfall", () => {
    const input = withStatus(
      patchData(twoOfThree(), "c3", { redHerring: true }),
      "c2",
      "rejected"
    )
    expect(checkSolvability(input).gaps).toEqual([
      {
        code: "missing_clue",
        message:
          "Arrest Max Rober requires C2, which was removed. Restore C2 or remove it from Requires. Arrest Max Rober needs 2 of its 3 Clues, and only 1 is usable.",
        entryId: "c2",
        arcIndex: null,
      },
      {
        code: "red_herring_required",
        message:
          "Arrest Max Rober requires C3, which is a red herring. Set its Red herring to no, or remove C3 from Requires. Arrest Max Rober needs 2 of its 3 Clues, and only 1 is usable.",
        entryId: "c3",
        arcIndex: null,
      },
    ])
  })

  it("fails when it needs more Clues than it lists", () => {
    expect(
      checkSolvability(patchData(world(), "arrest", { requiresCount: 3 })).gaps
    ).toEqual([
      {
        code: "missing_clue",
        message:
          "Arrest Max Rober needs 3 Clues but lists only 2. Add Clues to Requires, or lower Clues needed.",
        entryId: "arrest",
        arcIndex: null,
      },
    ])
  })
})
