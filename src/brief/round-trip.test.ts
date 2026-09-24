/**
 * Spec §7.4, the day-1 BlockNote test, for the §7.1 design (docs/design/editor-design.md):
 * a Character section with personality, backstory and one custom field, some
 * of it multi-line and some Hidden, round-trips through conversion to the
 * Brief object.
 *
 * The document goes through BlockNote's real schema (a headless editor over
 * the shared configs), so this proves the document model, not just our types.
 */
import { describe, expect, it } from "vitest"

import { documentToBrief } from "@/brief/from-document"
import {
  briefToDocument,
  sectionHeading,
  sequentialIds,
} from "@/brief/to-document"
import { fieldParagraph } from "@/editor/field-line"
import { normaliseDocument } from "@/editor/headless"
import type { SandsBlock } from "@/editor/schema-config"

function characterDocument(): SandsBlock[] {
  return [
    sectionHeading("character", "char-jacob", {
      name: "Jacob Flannery",
      isPlayer: true,
    }),
    fieldParagraph(
      "f-personality",
      "Personality",
      "Weary and sharp-eyed.\nDrinks more than he admits, and knows it."
    ),
    fieldParagraph(
      "f-backstory",
      "Backstory",
      "Called over from New York after three merchants died.\nHe left a daughter behind.",
      { hidden: true }
    ),
    fieldParagraph(
      "f-scar",
      "Scar",
      "A thin white scar across his left palm.\nHe never explains it.",
      { hidden: true }
    ),
    sectionHeading("arc", "arc-1", { name: "Introduction" }),
    sectionHeading("ending", "ending-1"),
    fieldParagraph("f-ending", "Condition", "The killer is caught."),
  ]
}

describe("§7.4 Character section round trip", () => {
  it("BlockNote keeps the heading, its Player mark, multi-line values and the Hidden style", () => {
    const stored = normaliseDocument(characterDocument())

    expect(stored[0]).toMatchObject({
      type: "character",
      props: { isPlayer: true },
      children: [],
    })
    const backstory = stored.find((block) => block.id === "f-backstory")!
    expect(backstory.content).toEqual([
      { type: "text", text: "Backstory:", styles: { bold: true } },
      { type: "text", text: " ", styles: {} },
      {
        type: "text",
        text: "Called over from New York after three merchants died.\nHe left a daughter behind.",
        styles: { hidden: true },
      },
    ])
  })

  it("converts to the Brief object: typed fields, custom field as a key fact, Hidden kept", () => {
    const { validation, draft } = documentToBrief(
      normaliseDocument(characterDocument())
    )

    expect(validation.success).toBe(true)
    expect(draft.characters).toEqual([
      {
        blockId: "char-jacob",
        name: "Jacob Flannery",
        role: "",
        age: "",
        personality:
          "Weary and sharp-eyed.\nDrinks more than he admits, and knows it.",
        backstory:
          "Called over from New York after three merchants died.\nHe left a daughter behind.",
        aliases: [],
        isPlayer: true,
        hiddenFields: ["backstory"],
        keyFacts: [
          {
            label: "Scar",
            text: "A thin white scar across his left palm.\nHe never explains it.",
            hidden: true,
          },
        ],
      },
    ])
  })

  it("round-trips document -> Brief -> document -> Brief without loss", () => {
    const first = documentToBrief(normaliseDocument(characterDocument()))
    expect(first.validation.success).toBe(true)

    const rebuilt = normaliseDocument(
      briefToDocument(first.draft, { ids: sequentialIds("rt") })
    )
    const second = documentToBrief(rebuilt)

    expect(second.draft).toEqual(first.draft)
    expect(second.validation).toEqual(first.validation)
  })
})
