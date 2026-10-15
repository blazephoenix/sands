/**
 * The Skeleton editor's documents and the Skeleton read from them.
 *
 * The editor shows one section at a time. Story, Play settings and Voice and
 * canon are each one document of `Label: value` lines. Every other section is
 * a list of rows (a character, an Arc, a Place…), each its own document: the
 * row's name as a heading, then `Label: value` lines, then, for characters
 * and Arcs, a table of Ties or Agendas.
 *
 * This module works on the documents' JSON only, never on a live editor, so
 * the server converts what it stores and the client converts what it shows
 * with the same code.
 *
 * Reading rules, per document:
 * - A paragraph that starts with one of the document's labels and a colon
 *   ("Want: …", any case) starts that field. Any other paragraph or list item
 *   continues the field above it, as a new line.
 * - Text before the first field, and headings that are not the row's name or
 *   its table's caption, are kept in the document but not in the Skeleton;
 *   `notes` says where, so the Author can see the Writer won't read it.
 * - In a table, the first row is the header; the others are read by column
 *   position, and blank rows are skipped.
 * - The Hidden style becomes `<hidden>…</hidden>`; other styles are kept in
 *   the document only.
 */
import { z } from "zod"

import { emptySkeleton, type Skeleton } from "@/domain/skeleton"
import { newId } from "@/lib/ids"

import {
  fromSegments,
  plainText,
  toSegments,
  type Segment,
} from "./hidden-text"

/** A BlockNote block as stored: whatever the editor saved, or a partial block written here. */
export type DocBlock = {
  id?: string
  type: string
  props?: Record<string, unknown>
  content?: unknown
  children?: DocBlock[]
}

export type DocRow = { id: string; blocks: DocBlock[] }

export const FIELD_SECTIONS = [
  "story",
  "playSettings",
  "voiceAndCanon",
] as const
export type FieldSection = (typeof FIELD_SECTIONS)[number]

export const ROW_SECTIONS = [
  "characters",
  "places",
  "worldRules",
  "promises",
  "arcs",
  "secrets",
  "endings",
  "stateFlags",
] as const
export type RowSection = (typeof ROW_SECTIONS)[number]

export type SkeletonDocument = { [K in FieldSection]: DocBlock[] } & {
  [K in RowSection]: DocRow[]
} & { writerMayInventEndings: boolean }

const blocksSchema = z.array(
  z.looseObject({ type: z.string() })
) as unknown as z.ZodType<DocBlock[]>
const rowsSchema = z.array(
  z.object({ id: z.string().min(1), blocks: blocksSchema })
)

export const skeletonDocumentSchema = z.object({
  story: blocksSchema,
  playSettings: blocksSchema,
  voiceAndCanon: blocksSchema,
  characters: rowsSchema,
  places: rowsSchema,
  worldRules: rowsSchema,
  promises: rowsSchema,
  arcs: rowsSchema,
  secrets: rowsSchema,
  endings: rowsSchema,
  stateFlags: rowsSchema,
  writerMayInventEndings: z.boolean(),
}) as z.ZodType<SkeletonDocument>

// The editor's labels for every field, in the editor's order.

type Fields<T> = readonly (readonly [label: string, key: keyof T & string])[]

type Row<S extends RowSection> = Skeleton[S][number]

type RowConfig<S extends RowSection> = {
  /** The section's name in the editor. */
  title: string
  /** One row, in words: "character", "World rule". */
  noun: string
  /** The field the row's heading holds. */
  nameKey: keyof Row<S> & string
  /** What the empty heading asks for. */
  namePlaceholder: string
  fields: Fields<Row<S>>
  table?: {
    caption: string
    key: keyof Row<S> & string
    columns: readonly string[]
    /** Keys of one table row, in column order. */
    cells: readonly string[]
  }
}

export const FIELD_SECTION_CONFIG: {
  [K in FieldSection]: { title: string; fields: Fields<Skeleton[K]> }
} = {
  story: {
    title: "Story",
    fields: [
      ["Title", "title"],
      ["Premise", "premise"],
      ["Genre", "genre"],
      ["Theme", "theme"],
      ["Setting", "setting"],
      ["Period", "period"],
      ["Based on", "basedOn"],
    ],
  },
  playSettings: {
    title: "Play settings",
    fields: [
      ["Player character", "playerCharacter"],
      ["Point of view", "pointOfView"],
      ["Opening", "opening"],
      ["Offscreen scenes", "offscreenScenes"],
      ["Claims", "claims"],
    ],
  },
  voiceAndCanon: {
    title: "Voice and canon",
    fields: [
      ["Voice", "voice"],
      ["Sample passage", "samplePassage"],
      ["Fixed facts", "fixedFacts"],
      ["Writer may invent", "writerMayInvent"],
      ["Writer must not invent", "writerMustNotInvent"],
      ["Pacing", "pacing"],
      ["Never", "never"],
    ],
  },
}

export const ROW_SECTION_CONFIG: { [K in RowSection]: RowConfig<K> } = {
  characters: {
    title: "Characters",
    noun: "character",
    nameKey: "name",
    namePlaceholder: "Character name",
    fields: [
      ["Aliases", "aliases"],
      ["Role", "role"],
      ["Core", "core"],
      ["Want", "want"],
      ["Want priority", "wantPriority"],
      ["Fear or weakness", "fearOrWeakness"],
      ["Lines", "lines"],
      ["Speech", "speech"],
      ["Knows", "knows"],
      ["Believes", "believes"],
    ],
    table: {
      caption: "Ties",
      key: "ties",
      columns: ["Toward", "Wants from them", "Friction", "Starts as"],
      cells: ["toward", "wants", "friction", "startsAs"],
    },
  },
  places: {
    title: "Places",
    noun: "Place",
    nameKey: "name",
    namePlaceholder: "Place name",
    fields: [
      ["Description", "description"],
      ["Connects to", "connectsTo"],
      ["What happens here", "whatHappensHere"],
    ],
  },
  worldRules: {
    title: "World rules",
    noun: "World rule",
    nameKey: "rule",
    namePlaceholder: "The World rule, in a few words",
    fields: [
      ["What it allows", "allows"],
      ["Cost or limit", "costOrLimit"],
      ["What it cannot do", "cannotDo"],
      ["Exceptions", "exceptions"],
    ],
  },
  promises: {
    title: "Promises",
    noun: "Promise",
    nameKey: "promise",
    namePlaceholder: "The Promise, in a few words",
    fields: [
      ["Setup", "setup"],
      ["Payoff", "payoff"],
      ["Earliest Arc", "earliestArc"],
    ],
  },
  arcs: {
    title: "Arcs",
    noun: "Arc",
    nameKey: "name",
    namePlaceholder: "Arc name",
    fields: [
      ["Description", "description"],
      ["Function", "function"],
      ["Set pieces", "setPieces"],
      ["Must-land moments", "mustLandMoments"],
      ["Stakes", "stakes"],
      ["If landed early", "ifLandedEarly"],
    ],
    table: {
      caption: "Agendas",
      key: "agendas",
      columns: ["Character", "Want this Arc", "Steps, in order", "If blocked"],
      cells: ["character", "want", "steps", "ifBlocked"],
    },
  },
  secrets: {
    title: "Hidden truth",
    noun: "Secret",
    nameKey: "secret",
    namePlaceholder: "The Secret: what is true",
    fields: [
      ["Who knows", "whoKnows"],
      ["How it surfaces", "howItSurfaces"],
      ["Earliest Arc", "earliestArc"],
      ["What the Player can do with it", "whatPlayerCanDo"],
    ],
  },
  endings: {
    title: "Endings",
    noun: "Ending",
    nameKey: "name",
    namePlaceholder: "Ending name",
    fields: [
      ["Kind", "kind"],
      ["Trigger", "trigger"],
      ["Earliest Arc", "earliestArc"],
    ],
  },
  stateFlags: {
    title: "State flags",
    noun: "State flag",
    nameKey: "flag",
    namePlaceholder: "Flag name",
    fields: [
      ["Values", "values"],
      ["Epilogue line per value", "epilogue"],
    ],
  },
}

// Inline content <-> field text

type InlineText = { type: "text"; text: string; styles: Record<string, true> }

function segmentsOf(content: unknown): Segment[] {
  if (typeof content === "string") return [{ text: content, hidden: false }]
  if (!Array.isArray(content)) return []
  return content.flatMap((item): Segment[] => {
    if (typeof item === "string") return [{ text: item, hidden: false }]
    if (!item || typeof item !== "object") return []
    const node = item as {
      type?: string
      text?: unknown
      styles?: unknown
      content?: unknown
    }
    if (node.type === "text" && typeof node.text === "string") {
      const styles = (node.styles ?? {}) as Record<string, unknown>
      return [{ text: node.text, hidden: styles.hidden === true }]
    }
    // A link, or any other inline node with content: its text.
    return segmentsOf(node.content)
  })
}

function inlineOf(value: string): InlineText[] {
  return toSegments(value).map((segment): InlineText => ({
    type: "text",
    text: segment.text,
    styles: segment.hidden ? { hidden: true } : {},
  }))
}

/** Drops the first `count` characters from a run of segments. */
function dropPrefix(segments: readonly Segment[], count: number): Segment[] {
  let left = count
  const out: Segment[] = []
  for (const segment of segments) {
    if (left >= segment.text.length) {
      left -= segment.text.length
      continue
    }
    out.push({ ...segment, text: segment.text.slice(left) })
    left = 0
  }
  return out
}

function trimSegments(segments: Segment[]): Segment[] {
  const text = fromSegments(segments)
  const plain = plainText(text)
  if (plain.trim() === plain) return segments
  const lead = plain.length - plain.trimStart().length
  const kept = dropPrefix(segments, lead)
  // Trim the end by walking back over whitespace-only tails.
  while (kept.length > 0) {
    const last = kept[kept.length - 1]
    const trimmed = last.text.trimEnd()
    if (trimmed) {
      kept[kept.length - 1] = { ...last, text: trimmed }
      break
    }
    kept.pop()
  }
  return kept
}

// Reading

export type DocumentNote = { path: string; message: string }

const OUTSIDE_FIELD =
  "Some text here isn't under a field label, so the Writer won't read it. Start its line with a label, such as “Want:”, or move it under one."

type Reading = {
  values: Record<string, string>
  tables: string[][]
  name: string
  outside: boolean
}

function readBlocks(
  blocks: readonly DocBlock[],
  labels: ReadonlyMap<string, string>,
  options: { nameHeading: boolean; caption?: string }
): Reading {
  const values: Record<string, Segment[][]> = {}
  const tables: string[][] = []
  let name: Segment[] | null = null
  let current: string | null = null
  let outside = false

  const visit = (block: DocBlock) => {
    if (block.type === "table") {
      const content = block.content as
        { rows?: { cells?: unknown[] }[] } | undefined
      for (const row of (content?.rows ?? []).slice(1)) {
        const cells = (row.cells ?? []).map((cell) => {
          const inner =
            cell && typeof cell === "object" && !Array.isArray(cell)
              ? (cell as { content?: unknown }).content
              : cell
          return fromSegments(trimSegments(segmentsOf(inner)))
        })
        if (cells.some((cell) => plainText(cell).trim())) tables.push(cells)
      }
      return
    }
    const segments = segmentsOf(block.content)
    const plain = segments.map((s) => s.text).join("")
    if (block.type === "heading") {
      if (options.nameHeading && name === null) name = segments
      else if (
        !options.caption ||
        plain.trim().toLowerCase() !== options.caption.toLowerCase()
      ) {
        if (plain.trim()) outside = true
      }
      current = null
    } else {
      const match = /^\s*([^:\n]{1,60}?)\s*:\s*/.exec(plain)
      const key = match ? labels.get(match[1].toLowerCase()) : undefined
      if (match && key) {
        current = key
        values[key] = [
          ...(values[key] ?? []),
          dropPrefix(segments, match[0].length),
        ]
      } else if (plain.trim()) {
        if (current) values[current].push(segments)
        else outside = true
      }
    }
    for (const child of block.children ?? []) visit(child)
  }
  for (const block of blocks) visit(block)

  const joined: Record<string, string> = {}
  for (const [key, lines] of Object.entries(values)) {
    joined[key] = lines
      .map((line) => fromSegments(trimSegments(line)))
      .filter((line) => plainText(line).trim() !== "")
      .join("\n")
  }
  return {
    values: joined,
    tables,
    name: name ? fromSegments(trimSegments(name)) : "",
    outside,
  }
}

function labelMap(fields: Fields<object>) {
  return new Map(fields.map(([label, key]) => [label.toLowerCase(), key]))
}

function readFieldSection<K extends FieldSection>(
  section: K,
  blocks: readonly DocBlock[],
  notes: DocumentNote[]
): Skeleton[K] {
  const { fields } = FIELD_SECTION_CONFIG[section]
  const reading = readBlocks(blocks, labelMap(fields as Fields<object>), {
    nameHeading: false,
  })
  if (reading.outside) notes.push({ path: section, message: OUTSIDE_FIELD })
  const out = { ...emptySkeleton()[section] } as Record<string, string>
  for (const [, key] of fields) out[key] = reading.values[key] ?? ""
  return out as Skeleton[K]
}

function readRow<S extends RowSection>(
  section: S,
  row: DocRow,
  index: number,
  notes: DocumentNote[]
): Row<S> {
  const config = ROW_SECTION_CONFIG[section] as RowConfig<S>
  const reading = readBlocks(
    row.blocks,
    labelMap(config.fields as Fields<object>),
    {
      nameHeading: true,
      caption: config.table?.caption,
    }
  )
  if (reading.outside)
    notes.push({ path: `${section}.${index}`, message: OUTSIDE_FIELD })
  const out: Record<string, unknown> = { [config.nameKey]: reading.name }
  for (const [, key] of config.fields) out[key] = reading.values[key] ?? ""
  if (config.table) {
    out[config.table.key] = reading.tables.map((cells) =>
      Object.fromEntries(
        config.table!.cells.map((key, column) => [key, cells[column] ?? ""])
      )
    )
  }
  return out as Row<S>
}

/** The Skeleton the documents hold, and where they hold text the Writer won't read. */
export function documentToSkeleton(document: SkeletonDocument): {
  skeleton: Skeleton
  notes: DocumentNote[]
} {
  const notes: DocumentNote[] = []
  const rows = <S extends RowSection>(section: S) =>
    document[section].map((row, index) => readRow(section, row, index, notes))
  const skeleton: Skeleton = {
    story: readFieldSection("story", document.story, notes),
    playSettings: readFieldSection(
      "playSettings",
      document.playSettings,
      notes
    ),
    characters: rows("characters"),
    places: rows("places"),
    worldRules: rows("worldRules"),
    promises: rows("promises"),
    arcs: rows("arcs"),
    secrets: rows("secrets"),
    endings: rows("endings"),
    writerMayInventEndings: document.writerMayInventEndings,
    stateFlags: rows("stateFlags"),
    voiceAndCanon: readFieldSection(
      "voiceAndCanon",
      document.voiceAndCanon,
      notes
    ),
  }
  return { skeleton, notes }
}

// Writing

function fieldBlock(label: string, value: string): DocBlock {
  return {
    type: "paragraph",
    content: [
      { type: "text", text: `${label}: `, styles: { bold: true } },
      ...inlineOf(value),
    ],
  }
}

function fieldBlocks<T>(fields: Fields<T>, values: T): DocBlock[] {
  return fields.map(([label, key]) =>
    fieldBlock(label, String(values[key] ?? ""))
  )
}

function tableBlock(columns: readonly string[], rows: string[][]): DocBlock {
  // An empty table still offers one row to type into.
  const body = rows.length > 0 ? rows : [columns.map(() => "")]
  return {
    type: "table",
    content: {
      type: "tableContent",
      headerRows: 1,
      rows: [
        { cells: columns.map((column) => inlineOf(column)) },
        ...body.map((cells) => ({ cells: cells.map(inlineOf) })),
      ],
    },
  }
}

export function rowToBlocks<S extends RowSection>(
  section: S,
  row: Row<S>
): DocBlock[] {
  const config = ROW_SECTION_CONFIG[section] as RowConfig<S>
  const values = row as Record<string, unknown>
  const blocks: DocBlock[] = [
    {
      type: "heading",
      props: { level: 2 },
      content: inlineOf(String(values[config.nameKey] ?? "")),
    },
    ...fieldBlocks(config.fields as Fields<Record<string, unknown>>, values),
  ]
  if (config.table) {
    const items = (values[config.table.key] ?? []) as Record<string, string>[]
    blocks.push(
      {
        type: "heading",
        props: { level: 3 },
        content: inlineOf(config.table.caption),
      },
      tableBlock(
        config.table.columns,
        items.map((item) => config.table!.cells.map((key) => item[key] ?? ""))
      )
    )
  }
  return blocks
}

/** A new, empty row of a section. */
export function newRow(section: RowSection): DocRow {
  const empty: Record<string, unknown> = Object.fromEntries(
    [
      ROW_SECTION_CONFIG[section].nameKey,
      ...ROW_SECTION_CONFIG[section].fields.map(([, key]) => key),
    ].map((key) => [key, ""])
  )
  const table = ROW_SECTION_CONFIG[section].table
  if (table) empty[table.key] = []
  return { id: newId("r"), blocks: rowToBlocks(section, empty as never) }
}

export function skeletonToDocument(skeleton: Skeleton): SkeletonDocument {
  const rows = <S extends RowSection>(section: S): DocRow[] =>
    (skeleton[section] as Row<S>[]).map((row) => ({
      id: newId("r"),
      blocks: rowToBlocks(section, row),
    }))
  return {
    story: fieldBlocks(FIELD_SECTION_CONFIG.story.fields, skeleton.story),
    playSettings: fieldBlocks(
      FIELD_SECTION_CONFIG.playSettings.fields,
      skeleton.playSettings
    ),
    voiceAndCanon: fieldBlocks(
      FIELD_SECTION_CONFIG.voiceAndCanon.fields,
      skeleton.voiceAndCanon
    ),
    characters: rows("characters"),
    places: rows("places"),
    worldRules: rows("worldRules"),
    promises: rows("promises"),
    arcs: rows("arcs"),
    secrets: rows("secrets"),
    endings: rows("endings"),
    stateFlags: rows("stateFlags"),
    writerMayInventEndings: skeleton.writerMayInventEndings,
  }
}
