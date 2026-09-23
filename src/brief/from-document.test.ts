import { describe, expect, it } from "vitest"

import { hiddenTruth } from "@/domain/brief"
import { formatKeyFact } from "@/domain/entry"
import { normaliseDocument } from "@/editor/headless"
import type { SandsBlock } from "@/editor/schema-config"

import { documentToBrief } from "./from-document"
import { fieldBlock, headingBlock, newBriefTemplate, paragraphBlock, sequentialIds, typedBlock } from "./to-document"

const ids = () => sequentialIds("t")

function convert(blocks: SandsBlock[]) {
  return documentToBrief(normaliseDocument(blocks))
}

/** A minimal valid Brief: one player Character, one Arc, one Ending. */
function valid(extra: SandsBlock[] = []): SandsBlock[] {
  const id = ids()
  return [
    typedBlock("character", { name: "Jacob Flannery" }, { ids: id, blockId: "jacob", isPlayer: true }),
    typedBlock("arc", { name: "Introduction" }, { ids: id, blockId: "arc-1" }),
    typedBlock("ending", { condition: "The killer is caught." }, { ids: id, blockId: "ending" }),
    ...extra,
  ]
}

describe("document -> Brief: typed blocks", () => {
  it("reads every typed block", () => {
    const id = ids()
    const { draft, validation } = convert(
      valid([
        typedBlock("setting", { place: "London", period: "Autumn 1888" }, { ids: id, blockId: "setting" }),
        typedBlock("location", { name: "Scotland Yard", description: "Gaslit corridors." }, { ids: id, blockId: "yard" }),
        typedBlock("voice", { guidelines: "Short sentences.", samplePassages: "The river smelled of coal." }, { ids: id, blockId: "voice" }),
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

  it("splits list fields: aliases by comma, Exit conditions by line", () => {
    const id = ids()
    const { draft } = convert([
      typedBlock("character", { name: "Jacob", aliases: "The American,  Flannery ," }, { ids: id, isPlayer: true }),
      typedBlock("arc", { name: "Midpoint", exitConditions: "Learned the shared trade.\n\nVisited a crime scene." }, { ids: id }),
      typedBlock("ending", { condition: "x" }, { ids: id }),
    ])
    expect(draft.characters[0].aliases).toEqual(["The American", "Flannery"])
    expect(draft.arcs[0].exitConditions).toEqual(["Learned the shared trade.", "Visited a crime scene."])
  })

  it("keeps multi-paragraph fields as paragraphs separated by line breaks", () => {
    const id = ids()
    const { draft } = convert(valid([typedBlock("location", { name: "Docks", description: "Wool.\nTea.\n\n\nIvory.  " }, { ids: id })]))
    expect(draft.locations[0].description).toBe("Wool.\nTea.\n\nIvory.")
  })
})

describe("document -> Brief: custom and Hidden fields", () => {
  it("turns custom fields into key facts, in order, and skips empty ones", () => {
    const id = ids()
    const character = typedBlock(
      "character",
      { name: "Max Rober" },
      {
        ids: id,
        blockId: "max",
        keyFacts: [
          { label: "Motive", text: "Revenge against his father.", hidden: true },
          { label: "Habit", text: "Squares his papers before he stands.", hidden: false },
        ],
      }
    )
    character.children.push(fieldBlock("empty-custom", "custom", "", ""))
    const { draft } = convert(valid([character]))
    const max = draft.characters.find((c) => c.blockId === "max")!
    expect(max.keyFacts).toEqual([
      { label: "Motive", text: "Revenge against his father.", hidden: true },
      { label: "Habit", text: "Squares his papers before he stands.", hidden: false },
    ])
    // As they land in an Entry's key_facts.
    expect(max.keyFacts.map((f) => formatKeyFact(f.label, f.text))).toEqual([
      "Motive: Revenge against his father.",
      "Habit: Squares his papers before he stands.",
    ])
  })

  it("lists Hidden typed fields, and gathers the Hidden truth", () => {
    const id = ids()
    const { draft } = convert(
      valid([
        typedBlock(
          "character",
          { name: "Max Rober", backstory: "Disowned by his father." },
          { ids: id, blockId: "max", hiddenFields: ["backstory"], keyFacts: [{ label: "Motive", text: "Revenge.", hidden: true }] }
        ),
      ])
    )
    expect(draft.characters.find((c) => c.blockId === "max")?.hiddenFields).toEqual(["backstory"])
    expect(hiddenTruth(draft)).toEqual([
      { blockId: "max", field: "backstory", text: "Disowned by his father." },
      { blockId: "max", field: "Motive", text: "Revenge." },
    ])
  })
})

describe("document -> Brief: order and free prose", () => {
  it("keeps Arc order as document order", () => {
    const id = ids()
    const { draft } = convert([
      typedBlock("character", { name: "Jacob" }, { ids: id, isPlayer: true }),
      typedBlock("arc", { name: "Introduction" }, { ids: id }),
      paragraphBlock("p1", "Between the arcs."),
      typedBlock("arc", { name: "Midpoint" }, { ids: id }),
      typedBlock("ending", { condition: "x" }, { ids: id }),
      typedBlock("arc", { name: "End" }, { ids: id }),
    ])
    expect(draft.arcs.map((a) => a.name)).toEqual(["Introduction", "Midpoint", "End"])
  })

  it("groups free prose under its nearest heading", () => {
    const id = ids()
    const { draft } = convert(
      valid([
        paragraphBlock("p0", "Before any heading."),
        headingBlock("h1", "Notes for the Writer"),
        paragraphBlock("p1", "The killings are never shown."),
        typedBlock("location", { name: "Yard" }, { ids: id }),
        paragraphBlock("p2", "Every constable blames the dockers."),
        headingBlock("h2", "Tone"),
        paragraphBlock("p3", "Fog, not gore."),
        headingBlock("h3", "Empty section"),
      ])
    )
    expect(draft.prose).toEqual([
      { heading: null, headingBlockId: null, paragraphs: ["Before any heading."] },
      {
        heading: "Notes for the Writer",
        headingBlockId: "h1",
        paragraphs: ["The killings are never shown.", "Every constable blames the dockers."],
      },
      { heading: "Tone", headingBlockId: "h2", paragraphs: ["Fog, not gore."] },
      { heading: "Empty section", headingBlockId: "h3", paragraphs: [] },
    ])
  })
})

describe("document -> Brief: §7.1 rules, each issue names its block and field", () => {
  it("passes the new-Brief template once the player Character is named", () => {
    const template = newBriefTemplate(ids())
    const { issues } = convert(template)
    expect(issues.map((i) => i.code)).toEqual(["character_unnamed"])
    expect(issues[0].blockId).toBe(template[1].id)
    expect(issues[0].field).toBe("name")
    expect(issues[0].fieldBlockId).toBe(template[1].children[0].id)
  })

  it("requires exactly one player Character", () => {
    const id = ids()
    const none = convert([
      typedBlock("character", { name: "Jacob" }, { ids: id, blockId: "c1" }),
      typedBlock("arc", { name: "A" }, { ids: id }),
      typedBlock("ending", { condition: "x" }, { ids: id }),
    ])
    expect(none.issues).toEqual([
      expect.objectContaining({ code: "no_player_character", blockId: "c1", field: "isPlayer" }),
    ])

    const two = convert(valid([typedBlock("character", { name: "Amanda" }, { ids: id, blockId: "c2", isPlayer: true })]))
    expect(two.issues).toEqual([
      expect.objectContaining({ code: "several_player_characters", blockId: "c2", field: "isPlayer" }),
    ])

    const noCharacters = convert([typedBlock("arc", { name: "A" }, { ids: id }), typedBlock("ending", { condition: "x" }, { ids: id })])
    expect(noCharacters.issues).toEqual([expect.objectContaining({ code: "no_player_character", blockId: null, field: null })])
  })

  it("requires at least one Arc", () => {
    const id = ids()
    const { issues, validation } = convert([
      typedBlock("character", { name: "Jacob" }, { ids: id, isPlayer: true }),
      typedBlock("ending", { condition: "x" }, { ids: id }),
    ])
    expect(validation.success).toBe(false)
    expect(issues).toEqual([expect.objectContaining({ code: "no_arc", blockId: null, field: null })])
  })

  it("requires exactly one Ending", () => {
    const id = ids()
    const none = convert([
      typedBlock("character", { name: "Jacob" }, { ids: id, isPlayer: true }),
      typedBlock("arc", { name: "A" }, { ids: id }),
    ])
    expect(none.issues).toEqual([expect.objectContaining({ code: "no_ending", blockId: null })])

    const two = convert(valid([typedBlock("ending", { condition: "y" }, { ids: id, blockId: "ending-2" })]))
    expect(two.issues).toEqual([expect.objectContaining({ code: "several_endings", blockId: "ending-2", field: null })])
  })

  it("requires every Character to be named, pointing at the name field", () => {
    const id = ids()
    const unnamed = typedBlock("character", { role: "The killer" }, { ids: id, blockId: "unnamed" })
    const { issues } = convert(valid([unnamed]))
    expect(issues).toEqual([
      {
        code: "character_unnamed",
        message: "Every Character needs a name.",
        blockId: "unnamed",
        field: "name",
        fieldBlockId: unnamed.children[0].id,
      },
    ])
  })

  it("reports a field left outside any typed block", () => {
    const { issues, validation } = convert(valid([fieldBlock("stray", "custom", "Scar", "A thin scar.")]))
    expect(validation.success).toBe(false)
    expect(issues).toEqual([expect.objectContaining({ code: "field_outside_block", blockId: "stray", fieldBlockId: "stray" })])
  })

  it("returns the validated Brief with a single Ending when every rule passes", () => {
    const { validation } = convert(valid())
    expect(validation.success && validation.brief.ending.blockId).toBe("ending")
  })
})
