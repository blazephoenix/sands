/**
 * Brief -> Brief editor document. Pure.
 *
 * Used for the new-Brief template (spec §7.1), for fixtures, and for the
 * round-trip test. Typed blocks come out in a fixed order (Settings,
 * Characters, Locations, Arcs, Ending, Voices, then prose sections), so a
 * document -> Brief -> document round trip preserves content, not layout.
 */
import type { Brief, BriefDraft, KeyFact } from "@/domain/brief"
import { BRIEF_BLOCKS, CUSTOM_FIELD_KEY, type BriefBlockType } from "@/brief/fields"
import type { FieldBlock, SandsBlock } from "@/editor/schema-config"

export type IdFactory = () => string

export const randomId: IdFactory = () => crypto.randomUUID()

/** Deterministic ids for fixtures and tests: `${prefix}-1`, `${prefix}-2`, ... */
export function sequentialIds(prefix: string): IdFactory {
  let n = 0
  return () => `${prefix}-${++n}`
}

const proseProps = { backgroundColor: "default", textColor: "default", textAlignment: "left" } as const

function text(value: string) {
  return value ? [{ type: "text" as const, text: value, styles: {} }] : []
}

export function fieldBlock(
  id: string,
  key: string,
  label: string,
  value: string,
  hidden = false
): FieldBlock {
  return { id, type: "field", props: { key, label, hidden }, content: text(value), children: [] }
}

/** Field values by key; anything that is not a string or string list is ignored. */
type TypedValues = Record<string, unknown>

/** A typed block with every catalog field (empty or filled), then its custom fields. */
export function typedBlock(
  type: BriefBlockType,
  values: TypedValues,
  options: {
    ids: IdFactory
    blockId?: string
    hiddenFields?: string[]
    keyFacts?: KeyFact[]
    isPlayer?: boolean
  }
): SandsBlock {
  const spec = BRIEF_BLOCKS[type]
  const children: FieldBlock[] = spec.fields.map((field) => {
    const raw = values[field.key]
    const value = Array.isArray(raw)
      ? raw.filter((item): item is string => typeof item === "string").join(field.list === "comma" ? ", " : "\n")
      : typeof raw === "string"
        ? raw
        : ""
    return fieldBlock(
      options.ids(),
      field.key,
      field.label,
      value,
      options.hiddenFields?.includes(field.key) ?? false
    )
  })
  for (const fact of options.keyFacts ?? []) {
    children.push(fieldBlock(options.ids(), CUSTOM_FIELD_KEY, fact.label, fact.text, fact.hidden))
  }
  const id = options.blockId ?? options.ids()
  if (type === "character") {
    return { id, type, props: { isPlayer: options.isPlayer ?? false }, content: undefined, children }
  }
  return { id, type, props: {}, content: undefined, children } as SandsBlock
}

export function headingBlock(id: string, value: string, level: 1 | 2 | 3 = 2): SandsBlock {
  return {
    id,
    type: "heading",
    props: { ...proseProps, level, isToggleable: false },
    content: text(value),
    children: [],
  }
}

export function paragraphBlock(id: string, value: string): SandsBlock {
  return { id, type: "paragraph", props: { ...proseProps }, content: text(value), children: [] }
}

export function briefToDocument(
  brief: Brief | BriefDraft,
  options: { ids?: IdFactory; keepBlockIds?: boolean } = {}
): SandsBlock[] {
  const ids = options.ids ?? randomId
  const keep = options.keepBlockIds ?? true
  const blockId = (item: { blockId: string }) => (keep ? item.blockId : undefined)
  const endings = "ending" in brief ? [brief.ending] : brief.endings
  const doc: SandsBlock[] = []

  for (const s of brief.settings) {
    doc.push(typedBlock("setting", s, { ids, blockId: blockId(s), hiddenFields: s.hiddenFields, keyFacts: s.keyFacts }))
  }
  for (const c of brief.characters) {
    doc.push(
      typedBlock("character", c, {
        ids,
        blockId: blockId(c),
        hiddenFields: c.hiddenFields,
        keyFacts: c.keyFacts,
        isPlayer: c.isPlayer,
      })
    )
  }
  for (const l of brief.locations) {
    doc.push(typedBlock("location", l, { ids, blockId: blockId(l), hiddenFields: l.hiddenFields, keyFacts: l.keyFacts }))
  }
  for (const a of brief.arcs) {
    doc.push(typedBlock("arc", a, { ids, blockId: blockId(a), hiddenFields: a.hiddenFields, keyFacts: a.keyFacts }))
  }
  for (const e of endings) {
    doc.push(typedBlock("ending", e, { ids, blockId: blockId(e), hiddenFields: e.hiddenFields, keyFacts: e.keyFacts }))
  }
  for (const v of brief.voices) {
    doc.push(typedBlock("voice", v, { ids, blockId: blockId(v), hiddenFields: v.hiddenFields, keyFacts: v.keyFacts }))
  }
  for (const section of brief.prose) {
    if (section.heading !== null) {
      doc.push(headingBlock((keep && section.headingBlockId) || ids(), section.heading))
    }
    for (const paragraph of section.paragraphs) doc.push(paragraphBlock(ids(), paragraph))
  }
  return doc
}

/**
 * The new-Brief template (spec §7.1): one Setting, one player Character, three
 * Arcs and one Ending, all empty so each field shows its placeholder.
 */
export function newBriefTemplate(ids: IdFactory = randomId): SandsBlock[] {
  return [
    typedBlock("setting", {}, { ids }),
    typedBlock("character", {}, { ids, isPlayer: true }),
    typedBlock("arc", {}, { ids }),
    typedBlock("arc", {}, { ids }),
    typedBlock("arc", {}, { ids }),
    typedBlock("ending", {}, { ids }),
    paragraphBlock(ids(), ""),
  ]
}
