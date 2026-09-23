import { describe, expect, it } from "vitest"

import { hiddenTruth } from "@/domain/brief"
import { formatKeyFact } from "@/domain/entry"
import { fieldParagraph } from "@/editor/field-line"
import { normaliseDocument } from "@/editor/headless"
import type { SandsBlock } from "@/editor/schema-config"

import { BRIEF_BLOCK_TYPES, BRIEF_BLOCKS } from "./fields"
import { documentToBrief } from "./from-document"
import { briefSection, headingBlock, newBriefTemplate, paragraphBlock, sectionHeading, sequentialIds } from "./to-document"

const ids = () => sequentialIds("t")

function convert(blocks: SandsBlock[]) {
  return documentToBrief(normaliseDocument(blocks))
}

/** A minimal valid Brief: one player Character, one Arc, one Ending. */
function valid(extra: SandsBlock[] = []): SandsBlock[] {
  return [
    sectionHeading("character", "jacob", { name: "Jacob Flannery", isPlayer: true }),
    sectionHeading("arc", "arc-1", { name: "Introduction" }),
    sectionHeading("ending", "ending"),
    fieldParagraph("ending-condition", "Condition", "The killer is caught."),
    ...extra,
  ]
}

function bullet(id: string, value: string): SandsBlock {
  return { ...paragraphBlock(id, value), type: "bulletListItem" } as SandsBlock
}

describe("document -> Brief: sections and fields", () => {
  it("reads every section kind", () => {
    const { draft, validation } = convert(
      valid([
        sectionHeading("setting", "setting"),
        fieldParagraph("s1", "Place", "London"),
        fieldParagraph("s2", "Period", "Autumn 1888"),
        sectionHeading("location", "yard", { name: "Scotland Yard" }),
        fieldParagraph("l1", "Description", "Gaslit corridors."),
        sectionHeading("voice", "voice"),
        fieldParagraph("v1", "Guidelines", "Short sentences."),
        fieldParagraph("v2", "Sample passage", "The river smelled of coal."),
      ])
    )
    expect(validation.success).toBe(true)
    expect(draft.settings).toMatchObject([{ blockId: "setting", place: "London", period: "Autumn 1888" }])
    expect(draft.characters).toMatchObject([{ blockId: "jacob", name: "Jacob Flannery", isPlayer: true }])
    expect(draft.arcs).toMatchObject([{ blockId: "arc-1", name: "Introduction" }])
    expect(draft.endings).toMatchObject([{ blockId: "ending", condition: "The killer is caught." }])
    expect(draft.locations).toMatchObject([{ blockId: "yard", name: "Scotland Yard", description: "Gaslit corridors." }])
    expect(draft.voices).toMatchObject([{ blockId: "voice", guidelines: "Short sentences.", samplePassages: "The river smelled of coal." }])
  })

  it("the template holds a Label line for every known field of every kind", () => {
    for (const type of BRIEF_BLOCK_TYPES) {
      const [heading, ...fields] = briefSection(type, {}, { ids: ids() })
      expect(heading.type).toBe(type)
      expect(fields).toHaveLength(BRIEF_BLOCKS[type].fields.length)
    }
  })

  it("matches labels case-insensitively, with plural aliases", () => {
    const { draft } = convert(
      valid([
        sectionHeading("character", "amanda", { name: "Amanda Hopkins" }),
        fieldParagraph("a1", "ROLE", "Second in command"),
        fieldParagraph("a2", "  personality ", "Precise."),
        sectionHeading("arc", "arc-2", { name: "Midpoint" }),
        fieldParagraph("x1", "exit conditions", "Learned the shared trade."),
      ])
    )
    expect(draft.characters[1]).toMatchObject({ role: "Second in command", personality: "Precise." })
    expect(draft.arcs[1].exitConditions).toEqual(["Learned the shared trade."])
  })

  it("keeps Shift+Enter line breaks in multi-line values", () => {
    const { draft } = convert(valid([sectionHeading("location", "docks", { name: "Docks" }), fieldParagraph("d", "Description", "Wool.\nTea.\n\n\nIvory.  ")]))
    expect(draft.locations[0].description).toBe("Wool.\nTea.\n\nIvory.")
  })

  it("splits list fields: Aliases by comma, one Exit condition per line", () => {
    const { draft } = convert([
      sectionHeading("character", "c", { name: "Jacob", isPlayer: true }),
      fieldParagraph("c1", "Aliases", "The American,  Flannery ,"),
      sectionHeading("arc", "a", { name: "Midpoint" }),
      fieldParagraph("a1", "Exit condition", "Learned the shared trade."),
      fieldParagraph("a2", "Exit condition", "Visited a crime scene.\nMet Nell."),
      sectionHeading("ending", "e"),
    ])
    expect(draft.characters[0].aliases).toEqual(["The American", "Flannery"])
    expect(draft.arcs[0].exitConditions).toEqual(["Learned the shared trade.", "Visited a crime scene.", "Met Nell."])
  })

  it("points each field at its paragraph", () => {
    const { fieldBlockIds } = convert(valid([sectionHeading("setting", "s"), fieldParagraph("s-place", "place", "London")]))
    expect(fieldBlockIds.s).toEqual({ place: "s-place" })
    expect(fieldBlockIds.jacob).toEqual({ name: "jacob" })
  })
})

describe("document -> Brief: custom fields, typos and Hidden", () => {
  it("turns custom labels into key facts, in order, and skips empty ones", () => {
    const { draft } = convert(
      valid([
        sectionHeading("character", "max", { name: "Max Rober" }),
        fieldParagraph("m1", "Motive", "Revenge against his father.", { hidden: true }),
        fieldParagraph("m2", "Habit", "Squares his papers before he stands."),
        fieldParagraph("m3", "Scar", ""),
      ])
    )
    const max = draft.characters.find((c) => c.blockId === "max")!
    expect(max.keyFacts).toEqual([
      { label: "Motive", text: "Revenge against his father.", hidden: true },
      { label: "Habit", text: "Squares his papers before he stands.", hidden: false },
    ])
    // As they land in an Entry's key_facts at setup.
    expect(max.keyFacts.map((f) => formatKeyFact(f.label, f.text))).toEqual([
      "Motive: Revenge against his father.",
      "Habit: Squares his papers before he stands.",
    ])
  })

  it("warns about a near miss of a known label and keeps it as a custom field", () => {
    const { draft, warnings, validation } = convert(
      valid([sectionHeading("character", "max", { name: "Max Rober" }), fieldParagraph("typo", "Personalty", "Quiet.")])
    )
    expect(validation.success).toBe(true)
    expect(warnings).toEqual([
      expect.objectContaining({ code: "probable_typo", blockId: "typo", field: "Personalty", suggestion: "Personality" }),
    ])
    expect(draft.characters[1].keyFacts).toEqual([{ label: "Personalty", text: "Quiet.", hidden: false }])
  })

  it("does not take short custom labels for typos", () => {
    const { warnings } = convert(valid([sectionHeading("character", "max", { name: "Max" }), fieldParagraph("aim", "Aim", "Revenge.")]))
    expect(warnings).toEqual([])
  })

  it("marks a field Hidden when its value carries the Hidden style, and gathers the Hidden truth", () => {
    const { draft } = convert(
      valid([
        sectionHeading("character", "max", { name: "Max Rober" }),
        fieldParagraph("m1", "Backstory", "Disowned by his father.", { hidden: true }),
        fieldParagraph("m2", "Motive", "Revenge.", { hidden: true }),
        fieldParagraph("m3", "Role", "Clerk"),
      ])
    )
    expect(draft.characters.find((c) => c.blockId === "max")?.hiddenFields).toEqual(["backstory"])
    expect(hiddenTruth(draft)).toEqual([
      { blockId: "max", field: "backstory", text: "Disowned by his father." },
      { blockId: "max", field: "Motive", text: "Revenge." },
    ])
  })

  it("warns about an unnamed Arc or Location", () => {
    const { warnings } = convert(valid([sectionHeading("location", "nameless")]))
    expect(warnings).toEqual([expect.objectContaining({ code: "unnamed_section", blockId: "nameless" })])
  })
})

describe("document -> Brief: order and free prose", () => {
  it("keeps Arc order as document order", () => {
    const { draft } = convert([
      sectionHeading("character", "c", { name: "Jacob", isPlayer: true }),
      sectionHeading("arc", "a1", { name: "Introduction" }),
      paragraphBlock("p1", "Between the arcs."),
      sectionHeading("arc", "a2", { name: "Midpoint" }),
      sectionHeading("ending", "e"),
      sectionHeading("arc", "a3", { name: "End" }),
    ])
    expect(draft.arcs.map((a) => a.name)).toEqual(["Introduction", "Midpoint", "End"])
  })

  it("ends a section at free prose: a later Label line is prose too", () => {
    const { draft } = convert(
      valid([
        sectionHeading("location", "yard", { name: "Scotland Yard" }),
        fieldParagraph("y1", "Description", "Gaslit."),
        paragraphBlock("p", "The Yard is under pressure."),
        fieldParagraph("y2", "Description", "Not part of the Yard any more."),
      ])
    )
    expect(draft.locations[0].description).toBe("Gaslit.")
    expect(draft.prose).toEqual([
      { heading: null, headingBlockId: null, paragraphs: ["The Yard is under pressure.", "Description: Not part of the Yard any more."] },
    ])
  })

  it("skips blank lines inside a section", () => {
    const { draft } = convert(
      valid([
        sectionHeading("location", "yard", { name: "Scotland Yard" }),
        paragraphBlock("blank", ""),
        fieldParagraph("y1", "Description", "Gaslit."),
      ])
    )
    expect(draft.locations[0].description).toBe("Gaslit.")
  })

  it("treats lists, quotes and headings as prose, even when they read Label: value", () => {
    const { draft } = convert(
      valid([sectionHeading("location", "yard", { name: "Scotland Yard" }), bullet("b", "Description: a list item")])
    )
    expect(draft.locations[0].description).toBe("")
    expect(draft.prose[0].paragraphs).toEqual(["- Description: a list item"])
  })

  it("groups free prose under its nearest heading", () => {
    const { draft } = convert(
      valid([
        paragraphBlock("p0", "Before any heading."),
        headingBlock("h1", "Notes for the Writer"),
        paragraphBlock("p1", "The killings are never shown."),
        sectionHeading("location", "yard", { name: "Yard" }),
        paragraphBlock("p2", "Every constable blames the dockers."),
        headingBlock("h2", "Tone"),
        paragraphBlock("p3", "Fog, not gore."),
        headingBlock("h3", "Empty section"),
      ])
    )
    expect(draft.prose).toEqual([
      { heading: null, headingBlockId: null, paragraphs: ["Before any heading."] },
      { heading: "Notes for the Writer", headingBlockId: "h1", paragraphs: ["The killings are never shown.", "Every constable blames the dockers."] },
      { heading: "Tone", headingBlockId: "h2", paragraphs: ["Fog, not gore."] },
      { heading: "Empty section", headingBlockId: "h3", paragraphs: [] },
    ])
  })
})

describe("document -> Brief: §7.1 rules, each issue names its block and field", () => {
  it("flags only the unnamed player Character in the new-Brief template", () => {
    const template = newBriefTemplate(ids())
    const { issues } = convert(template)
    const character = template.find((b) => b.type === "character")!
    expect(issues).toEqual([
      expect.objectContaining({ code: "character_unnamed", blockId: character.id, field: "name", fieldBlockId: character.id }),
    ])
  })

  it("requires exactly one player Character", () => {
    const none = convert([
      sectionHeading("character", "c1", { name: "Jacob" }),
      sectionHeading("arc", "a", { name: "A" }),
      sectionHeading("ending", "e"),
    ])
    expect(none.issues).toEqual([expect.objectContaining({ code: "no_player_character", blockId: "c1", field: "isPlayer" })])

    const two = convert(valid([sectionHeading("character", "c2", { name: "Amanda", isPlayer: true })]))
    expect(two.issues).toEqual([expect.objectContaining({ code: "several_player_characters", blockId: "c2", field: "isPlayer" })])

    const noCharacters = convert([sectionHeading("arc", "a", { name: "A" }), sectionHeading("ending", "e")])
    expect(noCharacters.issues).toEqual([expect.objectContaining({ code: "no_player_character", blockId: null, field: null })])
  })

  it("requires at least one Arc", () => {
    const { issues, validation } = convert([sectionHeading("character", "c", { name: "Jacob", isPlayer: true }), sectionHeading("ending", "e")])
    expect(validation.success).toBe(false)
    expect(issues).toEqual([expect.objectContaining({ code: "no_arc", blockId: null, field: null })])
  })

  it("requires exactly one Ending", () => {
    const none = convert([sectionHeading("character", "c", { name: "Jacob", isPlayer: true }), sectionHeading("arc", "a", { name: "A" })])
    expect(none.issues).toEqual([expect.objectContaining({ code: "no_ending", blockId: null })])

    const two = convert(valid([sectionHeading("ending", "ending-2")]))
    expect(two.issues).toEqual([expect.objectContaining({ code: "several_endings", blockId: "ending-2", field: null })])
  })

  it("requires every Character to be named, pointing at the heading", () => {
    const { issues } = convert(valid([sectionHeading("character", "unnamed"), fieldParagraph("u1", "Role", "The killer")]))
    expect(issues).toEqual([
      { code: "character_unnamed", message: "Every Character needs a name.", blockId: "unnamed", field: "name", fieldBlockId: "unnamed" },
    ])
  })

  it("returns the validated Brief with its single Ending when every rule passes", () => {
    const { validation } = convert(valid())
    expect(validation.success && validation.brief.ending.blockId).toBe("ending")
  })
})
