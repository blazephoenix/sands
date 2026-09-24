import { describe, expect, it } from "vitest"

import type { Entry, EntryOfKind } from "@/domain/entry"
import { londonBrief, testTime } from "@/test/london"

import { authorEntries } from "./author-entries"
import type { StoryLogicDraft, WorldDraft } from "./drafter-calls"
import { resolveStoryLogicDraft, resolveWorldDraft } from "./resolve"

function setupContext() {
  let n = 0
  return { worldId: "w1", now: testTime(0), newId: () => `e${++n}` }
}

const worldDraft: WorldDraft = {
  locations: [
    {
      name: "The Harbour",
      description: "Cranes and fog.",
      connections: ["scotland yard", "The Market", "Nowhere Street"],
    },
    {
      name: "The Market",
      description: "Stalls before dawn.",
      connections: ["The Market"],
    },
    { name: "Scotland Yard", description: "Again.", connections: [] },
  ],
  npcs: [
    {
      name: "Nell Garvey",
      description: "Sells flowers.",
      role: "Witness",
      age: "24",
      personality: "Quick to laugh.",
      backstory: "Sells violets every morning.",
      aliases: ["Nell"],
    },
    {
      name: "max rober",
      description: "A second Max.",
      role: "",
      age: "",
      personality: "",
      backstory: "",
      aliases: [],
    },
  ],
  exit_conditions: [
    { arc: 2, name: "Trade learned", condition: "The shared trade is known." },
    { arc: 7, name: "Beyond the story", condition: "Nothing." },
  ],
}

function world(draft: WorldDraft = worldDraft) {
  const { brief } = londonBrief("p")
  const context = setupContext()
  const author = authorEntries(brief, context)
  const drafted = resolveWorldDraft(draft, {
    brief,
    authorEntries: author,
    context,
  })
  return {
    brief,
    context,
    author,
    drafted,
    codex: [...author, ...drafted.entries],
  }
}

function named<K extends Entry["kind"]>(
  entries: readonly Entry[],
  kind: K,
  name: string
) {
  const found = entries.find((e) => e.kind === kind && e.name === name)
  if (!found) throw new Error(`No ${kind} named ${name}`)
  return found as EntryOfKind<K>
}

describe("resolving the World call's names to Entries", () => {
  it("connects drafted Locations to the Locations they name, ignoring case, and drops names that match nothing", () => {
    const { codex, drafted } = world()
    const harbour = named(codex, "location", "The Harbour")
    expect(harbour.data.connections).toEqual([
      named(codex, "location", "Scotland Yard").id,
      named(codex, "location", "The Market").id,
    ])
    expect(named(codex, "location", "The Market").data.connections).toEqual([])
    expect(harbour).toMatchObject({ source: "setup", status: "proposed" })
    expect(JSON.stringify(drafted.entries)).not.toContain("Nowhere Street")
    expect(drafted.notes.join(" ")).toMatch(/Nowhere Street/)
  })

  it("drops a drafted Location or NPC that repeats a name the World already has", () => {
    const { codex } = world()
    expect(codex.filter((e) => e.name === "Scotland Yard")).toHaveLength(1)
    expect(
      codex.filter((e) => e.name.toLowerCase() === "max rober")
    ).toHaveLength(1)
    expect(named(codex, "npc", "Nell Garvey").data).toMatchObject({
      role: "Witness",
      aliases: ["Nell"],
      isPlayer: false,
    })
  })

  it("keeps the Brief's start location, or makes the first drafted Location the start when the Brief has none", () => {
    expect(
      world()
        .codex.filter((e) => e.kind === "location" && e.data.isStart)
        .map((e) => e.name)
    ).toEqual(["Scotland Yard"])

    const { brief } = londonBrief("p")
    brief.locations = []
    const context = setupContext()
    const author = authorEntries(brief, context)
    const { entries } = resolveWorldDraft(worldDraft, {
      brief,
      authorEntries: author,
      context,
    })
    expect(
      entries
        .filter((e) => e.kind === "location" && e.data.isStart)
        .map((e) => e.name)
    ).toEqual(["The Harbour"])
  })

  it("files each Exit condition under its Arc, and drops one for an Arc the Brief does not have", () => {
    const exits = world().drafted.entries.filter(
      (e) => e.kind === "exit_condition"
    )
    expect(exits.map((e) => [e.name, e.data])).toEqual([
      [
        "Trade learned",
        { arcIndex: 1, condition: "The shared trade is known." },
      ],
    ])
  })
})

const storyDraft: StoryLogicDraft = {
  clues: [
    {
      key: "C1",
      title: "A torn page",
      description: "Caught on a nail.",
      location: "the harbour",
      known_by: [],
      reveals: "A list of creditors.",
      points_to_hidden_truth: true,
      red_herring: false,
    },
    {
      key: "C2",
      title: "What Nell saw",
      description: "At dawn.",
      location: null,
      known_by: ["Nell"],
      reveals: "A young clerk.",
      points_to_hidden_truth: true,
      red_herring: false,
    },
  ],
  knowledge: [
    {
      name: "Nell saw the clerk",
      description: "She tells a fair listener.",
      character: "NELL GARVEY",
      fact: "She saw a clerk leave at dawn.",
      min_band: "normal",
      clue: "c2",
    },
  ],
  decisive_actions: [
    {
      name: "Arrest Max Rober",
      description: "Arresting the right person wins.",
      verb: "arrest",
      target: "Max Rober",
      requires: ["C1", "C2"],
      clues_needed: null,
      on_success: "win",
    },
  ],
  exit_conditions: [],
}

function story(draft: StoryLogicDraft = storyDraft) {
  const { brief, codex, context } = world()
  return { codex, ...resolveStoryLogicDraft(draft, { brief, codex, context }) }
}

describe("resolving the Story logic call's names to Entries", () => {
  it("points every reference at the Entry it names, by name or alias and ignoring case", () => {
    const { codex, entries, gaps } = story()
    expect(gaps).toEqual([])
    const all = [...codex, ...entries]
    const c1 = named(all, "clue", "C1 — A torn page")
    const c2 = named(all, "clue", "C2 — What Nell saw")
    const nell = named(all, "npc", "Nell Garvey")
    expect(c1.data.locationId).toBe(named(all, "location", "The Harbour").id)
    expect(c2.data).toMatchObject({ locationId: null, knownBy: [nell.id] })
    expect(named(all, "knowledge", "Nell saw the clerk").data).toEqual({
      characterId: nell.id,
      fact: "She saw a clerk leave at dawn.",
      minBand: "normal",
      clueId: c2.id,
    })
    expect(named(all, "decisive_action", "Arrest Max Rober").data).toEqual({
      verb: "arrest",
      correctTargetId: named(all, "character", "Max Rober").id,
      requires: [c1.id, c2.id],
      requiresCount: null,
      onSuccess: "win",
      wrongTargetPenalty: 15,
      prematurePenalty: 20,
    })
    for (const entry of entries)
      expect(entry).toMatchObject({ source: "setup", status: "proposed" })
  })

  it("turns a name that matches no Entry into a Gap and never stores it", () => {
    const { entries, gaps } = story({
      ...storyDraft,
      clues: [
        { ...storyDraft.clues[0], location: "The Lighthouse" },
        { ...storyDraft.clues[1], known_by: ["Nell", "Old Tom"] },
      ],
      knowledge: [
        { ...storyDraft.knowledge[0] },
        {
          ...storyDraft.knowledge[0],
          name: "Tom's tale",
          character: "Old Tom",
        },
      ],
      decisive_actions: [
        { ...storyDraft.decisive_actions[0], requires: ["C1", "C2", "C9"] },
        {
          ...storyDraft.decisive_actions[0],
          name: "Arrest Tom",
          target: "Old Tom",
        },
      ],
    })
    const stored = JSON.stringify(entries)
    expect(stored).not.toContain("The Lighthouse")
    expect(stored).not.toContain("Old Tom")
    expect(stored).not.toContain("C9")
    expect(entries.map((e) => e.name)).not.toContain("Tom's tale")
    expect(entries.map((e) => e.name)).not.toContain("Arrest Tom")
    expect(gaps.every((g) => g.entryId === null && g.arcIndex === null)).toBe(
      true
    )
    expect(gaps.map((g) => [g.code, g.message])).toEqual(
      [
        'C1 is found at "The Lighthouse", but no Location has that name. Use the exact name of a Location in the Codex, or none.',
        'C2 is known by "Old Tom", but no character has that name. Use the exact name of a character in the Codex.',
        'Knowledge "Tom\'s tale" belongs to "Old Tom", but no character has that name. Use the exact name of a character in the Codex.',
        'Arrest Max Rober requires "C9", but no Clue has that key. Use the key of a Clue in the draft.',
        'Arrest Tom targets "Old Tom", but no character has that name. Use the exact name of a character in the Codex.',
      ].map((message) => ["unknown_name", message])
    )
  })

  it("keys Clues C1, C2 and so on, renumbering a key that is malformed or taken", () => {
    const { entries, gaps } = story({
      ...storyDraft,
      clues: [
        { ...storyDraft.clues[0], key: "clue one" },
        { ...storyDraft.clues[1], key: "C1" },
        { ...storyDraft.clues[1], key: "C1", title: "Twice" },
      ],
      knowledge: [],
      decisive_actions: [
        {
          ...storyDraft.decisive_actions[0],
          requires: ["clue one", "C1"],
        },
      ],
    })
    expect(gaps).toEqual([])
    const clues = entries.filter((e) => e.kind === "clue")
    expect(clues.map((c) => c.name)).toEqual([
      "C2 — A torn page",
      "C1 — What Nell saw",
      "C3 — Twice",
    ])
    const action = entries.find((e) => e.kind === "decisive_action")
    expect(action?.data).toMatchObject({
      requires: [clues[0].id, clues[1].id],
    })
  })

  it("rounds Clues needed and leaves out a count below one", () => {
    const counts = [2.4, 0].map((n) => {
      const { entries } = story({
        ...storyDraft,
        decisive_actions: [
          { ...storyDraft.decisive_actions[0], clues_needed: n },
        ],
      })
      const action = entries.find((e) => e.kind === "decisive_action")
      return action?.kind === "decisive_action"
        ? action.data.requiresCount
        : undefined
    })
    expect(counts).toEqual([2, null])
  })
})
