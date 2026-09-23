import { beforeAll, describe, expect, it } from "vitest"

import { ENTRY_KINDS, entryContentOf, type Entry } from "@/domain/entry"
import { londonEntries } from "@/fixtures/entries"

import { blockToEntry, documentToEntries, entriesToDocument, entryToBlock, newEntryBlock, parseKeyFact } from "./entry-blocks"
import { normaliseDocument } from "./headless"
import type { EntryBlock } from "./schema-config"

let entries: Entry[]
let byId: Map<string, Entry>

beforeAll(() => {
  entries = londonEntries("w-test", "t", "ready")
  byId = new Map(entries.map((e) => [e.id, e]))
})

const kindOf = (id: string) => byId.get(id)?.kind

describe("Entries <-> Entry blocks", () => {
  it("covers all nine kinds in the fixture Codex", () => {
    expect(new Set(entries.map((e) => e.kind))).toEqual(new Set(ENTRY_KINDS))
  })

  it("round-trips every Entry's content through BlockNote's schema", () => {
    const document = normaliseDocument(entriesToDocument(entries))
    const conversions = documentToEntries(document, { kindOf })
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

  it("groups Entries under World and Story logic with a heading per kind", () => {
    const document = entriesToDocument(entries)
    const headings = document.filter((b) => b.type === "entryGroup").map((b) => b.props as { group: string; kind: string })
    expect(headings[0]).toEqual({ group: "world", kind: "" })
    expect(headings.find((h) => h.group === "story_logic" && h.kind === "")).toBeTruthy()
    expect(headings.filter((h) => h.kind !== "").map((h) => h.kind)).toEqual([...ENTRY_KINDS])
  })

  it("keeps Hidden fields and custom fields of Characters", () => {
    const max = entries.find((e) => e.name === "Max Rober")!
    const [block] = normaliseDocument([entryToBlock(max)]) as EntryBlock[]
    const conversion = blockToEntry(block)
    expect(conversion.content).toEqual(entryContentOf(max))
    expect(block.children.filter((c) => c.type === "field" && c.props.hidden).map((c) => (c.props as { key: string; label: string }).label)).toEqual([
      "Backstory",
      "Motive",
    ])
  })

  it("reports a single-reference field holding two Entries, and a missing required reference", () => {
    const knowledge = entries.find((e) => e.kind === "knowledge")!
    const block = entryToBlock(knowledge, { nameOf: (id) => byId.get(id)?.name })
    const holder = block.children.find((c) => c.type === "field" && c.props.key === "characterId")!
    holder.content = [
      { type: "entryMention", props: { entryId: "t-nell", label: "Nell" }, content: undefined },
      { type: "entryMention", props: { entryId: "t-pryce", label: "Pryce" }, content: undefined },
    ]
    const tooMany = blockToEntry(normaliseDocument([block])[0] as EntryBlock, { kindOf })
    expect(tooMany.content).toBeNull()
    expect(tooMany.issues).toEqual([expect.objectContaining({ field: "characterId", fieldBlockId: holder.id })])

    holder.content = []
    const missing = blockToEntry(normaliseDocument([block])[0] as EntryBlock, { kindOf })
    expect(missing.issues[0].message).toMatch(/needs an Entry/)
  })

  it("reports a reference to the wrong kind of Entry", () => {
    const clue = entries.find((e) => e.kind === "clue" && e.data.locationId)!
    const block = entryToBlock(clue)
    const at = block.children.find((c) => c.type === "field" && c.props.key === "locationId")!
    at.content = [{ type: "entryMention", props: { entryId: "t-nell", label: "Nell" }, content: undefined }]
    const conversion = blockToEntry(normaliseDocument([block])[0] as EntryBlock, { kindOf })
    expect(conversion.issues[0]).toMatchObject({ field: "locationId", message: expect.stringMatching(/location/) })
  })

  it("makes a new, unstored Author Entry for each kind", () => {
    for (const kind of ENTRY_KINDS) {
      const block = newEntryBlock(kind)
      expect(block.props).toMatchObject({ entryId: "", source: "author", status: "accepted" })
      expect(blockToEntry(normaliseDocument([block])[0] as EntryBlock).kind).toBe(kind)
    }
  })

  it("parses key facts back into labelled custom fields", () => {
    expect(parseKeyFact("Motive: Revenge: slow and cold.")).toEqual({ label: "Motive", text: "Revenge: slow and cold." })
    expect(parseKeyFact("No label here")).toEqual({ label: "", text: "No label here" })
  })
})
