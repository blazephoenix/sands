/**
 * Brief -> Brief editor document (docs/design/editor-design.md). Pure.
 *
 * Used for the new-Brief template (spec §7.1), for test data, and for the
 * round-trip test. Sections come out in a fixed order (Settings, Characters,
 * Locations, Arcs, Ending, Voices, then prose), each heading followed by every
 * known `Label:` line (empty ones included, so the Author sees what goes where)
 * and then its custom fields. A document -> Brief -> document round trip
 * preserves content, not layout.
 */
import type { Brief, BriefDraft, KeyFact } from "@/domain/brief"
import { BRIEF_BLOCKS, type BriefBlockType } from "@/brief/fields"
import { fieldParagraph } from "@/editor/field-line"
import type { SandsBlock } from "@/editor/schema-config"

export type IdFactory = () => string

export const randomId: IdFactory = () => crypto.randomUUID()

/** Deterministic ids for test data: `${prefix}-1`, `${prefix}-2`, ... */
export function sequentialIds(prefix: string): IdFactory {
  let n = 0
  return () => `${prefix}-${++n}`
}

const proseProps = {
  backgroundColor: "default",
  textColor: "default",
  textAlignment: "left",
} as const

function text(value: string, styles: Record<string, boolean> = {}) {
  return value ? [{ type: "text" as const, text: value, styles }] : []
}

/** A section heading block. Named kinds take `name`; `hiddenName` gives it the Hidden style. */
export function sectionHeading(
  type: BriefBlockType,
  id: string,
  options: { name?: string; isPlayer?: boolean; hiddenName?: boolean } = {}
): SandsBlock {
  const spec = BRIEF_BLOCKS[type]
  const content = spec.named
    ? text(options.name ?? "", options.hiddenName ? { hidden: true } : {})
    : undefined
  const props =
    type === "character" ? { isPlayer: options.isPlayer ?? false } : {}
  return { id, type, props, content, children: [] } as SandsBlock
}

type SectionValues = Record<string, unknown>

/**
 * A whole section: its heading, one `Label:` line per known field (list fields
 * with `lines` get one line per item), then its custom fields.
 */
export function briefSection(
  type: BriefBlockType,
  values: SectionValues,
  options: {
    ids: IdFactory
    blockId?: string
    isPlayer?: boolean
    hiddenFields?: string[]
    keyFacts?: KeyFact[]
  }
): SandsBlock[] {
  const spec = BRIEF_BLOCKS[type]
  const hidden = new Set(options.hiddenFields ?? [])
  const styles = (key: string): Record<string, boolean> =>
    hidden.has(key) ? { hidden: true } : {}
  const blocks: SandsBlock[] = [
    sectionHeading(type, options.blockId ?? options.ids(), {
      name: typeof values.name === "string" ? values.name : "",
      isPlayer: options.isPlayer,
      hiddenName: hidden.has("name"),
    }),
  ]
  for (const field of spec.fields) {
    const raw = values[field.key]
    const items = Array.isArray(raw)
      ? raw.filter((item): item is string => typeof item === "string")
      : null
    if (items && field.list === "lines") {
      for (const item of items.length > 0 ? items : [""]) {
        blocks.push(
          fieldParagraph(options.ids(), field.label, item, styles(field.key))
        )
      }
      continue
    }
    const value = items ? items.join(", ") : typeof raw === "string" ? raw : ""
    blocks.push(
      fieldParagraph(options.ids(), field.label, value, styles(field.key))
    )
  }
  for (const fact of options.keyFacts ?? []) {
    blocks.push(
      fieldParagraph(
        options.ids(),
        fact.label,
        fact.text,
        fact.hidden ? { hidden: true } : {}
      )
    )
  }
  return blocks
}

export function headingBlock(
  id: string,
  value: string,
  level: 1 | 2 | 3 = 2
): SandsBlock {
  return {
    id,
    type: "heading",
    props: { ...proseProps, level, isToggleable: false },
    content: text(value),
    children: [],
  }
}

export function paragraphBlock(id: string, value: string): SandsBlock {
  return {
    id,
    type: "paragraph",
    props: { ...proseProps },
    content: text(value),
    children: [],
  }
}

export function briefToDocument(
  brief: Brief | BriefDraft,
  options: { ids?: IdFactory; keepBlockIds?: boolean } = {}
): SandsBlock[] {
  const ids = options.ids ?? randomId
  const keep = options.keepBlockIds ?? true
  const endings = "ending" in brief ? [brief.ending] : brief.endings
  const doc: SandsBlock[] = []
  const add = (
    type: BriefBlockType,
    item: {
      blockId: string
      hiddenFields: string[]
      keyFacts: KeyFact[]
    } & SectionValues,
    isPlayer?: boolean
  ) =>
    doc.push(
      ...briefSection(type, item, {
        ids,
        blockId: keep ? item.blockId : undefined,
        hiddenFields: item.hiddenFields,
        keyFacts: item.keyFacts,
        isPlayer,
      })
    )

  for (const item of brief.settings) add("setting", item)
  for (const item of brief.characters) add("character", item, item.isPlayer)
  for (const item of brief.locations) add("location", item)
  for (const item of brief.arcs) add("arc", item)
  for (const item of endings) add("ending", item)
  for (const item of brief.voices) add("voice", item)
  for (const section of brief.prose) {
    if (section.heading !== null)
      doc.push(
        headingBlock((keep && section.headingBlockId) || ids(), section.heading)
      )
    for (const paragraph of section.paragraphs)
      doc.push(paragraphBlock(ids(), paragraph))
  }
  return doc
}

/**
 * The new-Brief template (spec §7.1): one Setting, one player Character, three
 * Arcs and one Ending, every `Label:` line empty so each shows its hint.
 */
export function newBriefTemplate(ids: IdFactory = randomId): SandsBlock[] {
  return [
    ...briefSection("setting", {}, { ids }),
    ...briefSection("character", {}, { ids, isPlayer: true }),
    ...briefSection("arc", {}, { ids }),
    ...briefSection("arc", {}, { ids }),
    ...briefSection("arc", {}, { ids }),
    ...briefSection("ending", {}, { ids }),
    paragraphBlock(ids(), ""),
  ]
}
