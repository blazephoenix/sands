import { describe, expect, it } from "vitest"

import { emptySkeleton } from "@/domain/skeleton"
import { FIXTURES } from "@/fixtures"
import { playableSkeleton } from "@/test/skeletons"

import {
  documentToSkeleton,
  newRow,
  skeletonDocumentSchema,
  skeletonToDocument,
  type DocBlock,
} from "./document"
import { hidden } from "./hidden-text"

const text = (t: string, styles: Record<string, true> = {}) => ({
  type: "text",
  text: t,
  styles,
})
const paragraph = (...content: unknown[]): DocBlock => ({
  type: "paragraph",
  content,
})

describe("the Skeleton's documents", () => {
  it.each(FIXTURES.map((f) => [f.story.title, f] as const))(
    "round-trip the fixture %s unchanged",
    (_, skeleton) => {
      const document = skeletonDocumentSchema.parse(
        JSON.parse(JSON.stringify(skeletonToDocument(skeleton)))
      )
      expect(documentToSkeleton(document)).toEqual({ skeleton, notes: [] })
    }
  )

  it("round-trip an empty Skeleton", () => {
    expect(documentToSkeleton(skeletonToDocument(emptySkeleton()))).toEqual({
      skeleton: emptySkeleton(),
      notes: [],
    })
  })

  it("read a field's label in any case, continue it on the paragraphs below, and keep Hidden text", () => {
    const document = skeletonToDocument(playableSkeleton())
    document.story = [
      paragraph(
        text("premise:", { bold: true }),
        text(" Two want "),
        text("one key", { hidden: true })
      ),
      paragraph(text("And only one gets it.")),
      paragraph(),
      paragraph(text("Title: The Test")),
    ]
    const { skeleton, notes } = documentToSkeleton(document)
    expect(skeleton.story.premise).toBe(
      `Two want ${hidden("one key")}\nAnd only one gets it.`
    )
    expect(skeleton.story.title).toBe("The Test")
    expect(notes).toEqual([])
  })

  it("note text outside any field, which the Writer won't read", () => {
    const document = skeletonToDocument(playableSkeleton())
    document.story = [paragraph(text("A stray thought.")), ...document.story]
    document.characters[0].blocks.push({
      type: "heading",
      props: { level: 3 },
      content: [text("Backstory")],
    })
    const { notes } = documentToSkeleton(document)
    expect(notes.map((note) => note.path)).toEqual(["story", "characters.0"])
  })

  it("read a table's rows by column and skip blank rows", () => {
    const document = skeletonToDocument(playableSkeleton())
    const ben = document.characters[1].blocks
    const table = ben.find((block) => block.type === "table")!
    const content = table.content as { rows: { cells: unknown[] }[] }
    content.rows.push({ cells: [[], [], [], []] })
    content.rows.push({
      cells: [{ type: "tableCell", content: [text("Cyd")] }, [], [], []],
    })
    const { skeleton } = documentToSkeleton(document)
    expect(skeleton.characters[1].ties.map((tie) => tie.toward)).toEqual([
      "Ada",
      "Cyd",
    ])
  })

  it("start a new row with its name heading, every label and an empty table", () => {
    const row = newRow("arcs")
    const document = skeletonToDocument(emptySkeleton())
    document.arcs.push(row)
    const { skeleton } = documentToSkeleton(document)
    expect(skeleton.arcs).toEqual([
      {
        name: "",
        description: "",
        function: "",
        setPieces: "",
        mustLandMoments: "",
        stakes: "",
        ifLandedEarly: "",
        agendas: [],
      },
    ])
  })
})
