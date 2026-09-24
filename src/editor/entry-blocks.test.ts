import { beforeAll, describe, expect, it } from "vitest"

import { ENTRY_KINDS, entryContentOf, type Entry } from "@/domain/entry"
import { londonEntries } from "@/test/london"

import {
  documentToEntries,
  entriesToDocument,
  entryToBlocks,
  newEntrySection,
  parseKeyFact,
} from "./entry-blocks"
import { fieldParagraph } from "./field-line"
import { normaliseDocument } from "./headless"
import type { SandsBlock, SandsInline } from "./schema-config"

let entries: Entry[]
let byId: Map<string, Entry>

beforeAll(() => {
  entries = londonEntries("w-test", "t", "ready")
  byId = new Map(entries.map((e) => [e.id, e]))
})

const kindOf = (id: string) => byId.get(id)?.kind
const nameOf = (id: string) => byId.get(id)?.name

function readBack(blocks: SandsBlock[]) {
  return documentToEntries(normaliseDocument(blocks), { kindOf })
}

function mention(entryId: string): SandsInline {
  return {
    type: "entryMention",
    props: { entryId, label: nameOf(entryId) ?? entryId },
    content: undefined,
  }
}

/** Replaces the value of one field line in an Entry's blocks. */
function withField(
  blocks: SandsBlock[],
  label: string,
  value: string | SandsInline[]
): SandsBlock[] {
  return blocks.map((block) => {
    const first = Array.isArray(block.content)
      ? (block.content[0] as { text?: string } | undefined)
      : undefined
    return first?.text === `${label}:`
      ? fieldParagraph(block.id, label, value)
      : block
  })
}

describe("Entries <-> Entry sections", () => {
  it("covers all nine kinds in the London Codex", () => {
    expect(new Set(entries.map((e) => e.kind))).toEqual(new Set(ENTRY_KINDS))
  })

  it("round-trips every Entry's content through BlockNote's schema", () => {
    const conversions = readBack(entriesToDocument(entries))
    expect(conversions).toHaveLength(entries.length)
    for (const conversion of conversions) {
      const original = byId.get(conversion.entryId)!
      expect(conversion.issues).toEqual([])
      expect(conversion.content).toEqual(entryContentOf(original))
      expect(conversion).toMatchObject({
        kind: original.kind,
        source: original.source,
        status: original.status,
        jevFlags: original.jevFlags,
      })
    }
  })

  it("writes kind data as Label: value lines", () => {
    const clue = entries.find((e) => e.kind === "clue" && e.data.redHerring)!
    const lines = entryToBlocks(clue, { nameOf })
      .slice(1)
      .map((block) =>
        (block.content as SandsInline[])
          .map((node) =>
            node.type === "text"
              ? node.text
              : `@${node.type === "entryMention" ? node.props.label : ""}`
          )
          .join("")
      )
    expect(lines).toContain("Red herring: yes")
    expect(lines).toContain("Points to Hidden truth: no")
    expect(lines).toContain("Found at: @Whitechapel High Street")
  })

  it("puts World Entries under a World divider and Story logic Entries under their own", () => {
    const document = entriesToDocument(entries)
    const dividers = document
      .filter((b) => b.type === "entryGroup")
      .map((b) => (b.props as { group: string }).group)
    expect(dividers).toEqual(["world", "story_logic"])
    expect(document[0].type).toBe("entryGroup")
  })

  it("keeps Hidden and custom fields of Characters", () => {
    const max = entries.find((e) => e.name === "Max Rober")!
    const [conversion] = readBack(entryToBlocks(max))
    expect(conversion.content).toEqual(entryContentOf(max))
  })

  it("reports bad values against the paragraph that holds them", () => {
    const clue = entries.find((e) => e.kind === "clue")!
    const blocks = withField(
      entryToBlocks(clue, { nameOf }),
      "Red herring",
      "maybe"
    )
    const [conversion] = readBack(blocks)
    expect(conversion.content).toBeNull()
    expect(conversion.issues).toEqual([
      expect.objectContaining({
        field: "redHerring",
        fieldBlockId: `${clue.id}:redHerring`,
        message: "Red herring takes yes or no.",
      }),
    ])
  })

  it("reports a single reference holding two Entries, and a missing required reference", () => {
    const knowledge = entries.find((e) => e.kind === "knowledge")!
    const two = withField(entryToBlocks(knowledge, { nameOf }), "Character", [
      mention("t-nell"),
      { type: "text", text: ", ", styles: {} },
      mention("t-pryce"),
    ])
    expect(readBack(two)[0].issues).toEqual([
      expect.objectContaining({
        field: "characterId",
        message: "Character takes one Entry. Remove the others.",
      }),
    ])

    const none = withField(
      entryToBlocks(knowledge, { nameOf }),
      "Character",
      ""
    )
    expect(readBack(none)[0].issues[0].message).toMatch(/needs an Entry/)
  })

  it("reports a reference to the wrong kind of Entry, and text where a mention belongs", () => {
    const clue = entries.find((e) => e.kind === "clue" && e.data.locationId)!
    const wrongKind = withField(entryToBlocks(clue, { nameOf }), "Found at", [
      mention("t-nell"),
    ])
    expect(readBack(wrongKind)[0].issues[0]).toMatchObject({
      field: "locationId",
      message: expect.stringMatching(/location/),
    })

    const typed = withField(
      entryToBlocks(clue, { nameOf }),
      "Found at",
      "the docks"
    )
    expect(readBack(typed)[0].issues[0].message).toMatch(/@ mentions only/)
  })

  it("parses numbers, Bands, Arcs and 'all'", () => {
    const action = entries.find((e) => e.kind === "decisive_action")!
    let blocks = withField(
      entryToBlocks(action, { nameOf }),
      "Clues needed",
      "all"
    )
    blocks = withField(blocks, "On success", "Continue")
    const [conversion] = readBack(blocks)
    expect(conversion.content?.data).toMatchObject({
      requiresCount: null,
      onSuccess: "none",
    })

    const exit = entries.find((e) => e.kind === "exit_condition")!
    const [arc] = readBack(
      withField(entryToBlocks(exit, { nameOf }), "Arc", "0")
    )
    expect(arc.issues[0].message).toMatch(/Arc number from 1/)
  })

  it("warns about a probable label typo and keeps the line as a key fact", () => {
    const nell = entries.find((e) => e.name === "Nell Garvey")!
    const blocks = [
      ...entryToBlocks(nell),
      fieldParagraph("typo", "Backstroy", "Grew up in Bethnal Green."),
    ]
    const [conversion] = readBack(blocks)
    expect(conversion.warnings).toEqual([
      expect.objectContaining({
        fieldBlockId: "typo",
        suggestion: "Backstory",
      }),
    ])
    expect(conversion.content?.keyFacts).toContain(
      "Backstroy: Grew up in Bethnal Green."
    )
  })

  it("lists every block that belongs to an Entry", () => {
    const faction = entries.find((e) => e.kind === "faction")!
    const [conversion] = readBack(entryToBlocks(faction))
    expect(conversion.blockIds).toEqual([
      faction.id,
      `${faction.id}:description`,
    ])
  })

  it("makes a new, unstored Author Entry section for each kind", () => {
    for (const kind of ENTRY_KINDS) {
      const [heading] = newEntrySection(kind)
      expect(heading.props).toMatchObject({
        entryId: "",
        source: "author",
        status: "accepted",
      })
      expect(readBack(newEntrySection(kind))[0].kind).toBe(kind)
    }
  })

  it("parses key facts back into labelled custom fields", () => {
    expect(parseKeyFact("Motive: Revenge: slow and cold.")).toEqual({
      label: "Motive",
      text: "Revenge: slow and cold.",
    })
    expect(parseKeyFact("No label here")).toEqual({
      label: "",
      text: "No label here",
    })
  })
})
