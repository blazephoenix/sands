/**
 * Spec §7.4, the day-1 BlockNote test: a typed block holds several labelled,
 * multi-paragraph fields with per-field Hidden toggles, and a Character with
 * personality, backstory and one custom field round-trips through conversion
 * to the Brief object.
 *
 * The document goes through BlockNote's real schema (a headless editor over
 * the shared configs), so this proves the document model, not just our types.
 */
import { describe, expect, it } from "vitest"

import { documentToBrief } from "@/brief/from-document"
import { briefToDocument, fieldBlock, sequentialIds } from "@/brief/to-document"
import { normaliseDocument } from "@/editor/headless"
import type { SandsBlock } from "@/editor/schema-config"

function characterDocument(): SandsBlock[] {
  return [
    {
      id: "char-jacob",
      type: "character",
      props: { isPlayer: true },
      content: undefined,
      children: [
        fieldBlock("f-name", "name", "Name", "Jacob Flannery"),
        fieldBlock(
          "f-personality",
          "personality",
          "Personality",
          "Weary and sharp-eyed.\nDrinks more than he admits, and knows it."
        ),
        fieldBlock(
          "f-backstory",
          "backstory",
          "Backstory",
          "Called over from New York after three merchants died.\nHe left a daughter behind.",
          true
        ),
        fieldBlock("f-scar", "custom", "Scar", "A thin white scar across his left palm.\nHe never explains it.", true),
      ],
    },
    { id: "arc-1", type: "arc", props: {}, content: undefined, children: [fieldBlock("f-arc-name", "name", "Name", "Introduction")] },
    {
      id: "ending-1",
      type: "ending",
      props: {},
      content: undefined,
      children: [fieldBlock("f-ending", "condition", "Win condition", "The killer is caught.")],
    },
  ]
}

describe("§7.4 Character block round trip", () => {
  it("BlockNote keeps several labelled multi-paragraph fields with per-field Hidden flags", () => {
    const stored = normaliseDocument(characterDocument())
    const character = stored[0]

    expect(character.type).toBe("character")
    expect(character.children.map((c) => c.type)).toEqual(["field", "field", "field", "field"])
    const fields = character.children.map((c) => (c.type === "field" ? c.props : null))
    expect(fields).toEqual([
      { key: "name", label: "Name", hidden: false },
      { key: "personality", label: "Personality", hidden: false },
      { key: "backstory", label: "Backstory", hidden: true },
      { key: "custom", label: "Scar", hidden: true },
    ])
  })

  it("converts to the Brief object: typed fields, custom field as a key fact, Hidden kept", () => {
    const { validation, draft } = documentToBrief(normaliseDocument(characterDocument()))

    expect(validation.success).toBe(true)
    expect(draft.characters).toEqual([
      {
        blockId: "char-jacob",
        name: "Jacob Flannery",
        role: "",
        age: "",
        personality: "Weary and sharp-eyed.\nDrinks more than he admits, and knows it.",
        backstory: "Called over from New York after three merchants died.\nHe left a daughter behind.",
        aliases: [],
        isPlayer: true,
        hiddenFields: ["backstory"],
        keyFacts: [{ label: "Scar", text: "A thin white scar across his left palm.\nHe never explains it.", hidden: true }],
      },
    ])
  })

  it("round-trips document -> Brief -> document -> Brief without loss", () => {
    const first = documentToBrief(normaliseDocument(characterDocument()))
    expect(first.validation.success).toBe(true)

    const rebuilt = normaliseDocument(briefToDocument(first.draft, { ids: sequentialIds("rt") }))
    const second = documentToBrief(rebuilt)

    expect(second.draft).toEqual(first.draft)
    expect(second.validation).toEqual(first.validation)
  })
})
