/**
 * Brief editor document -> Brief (spec §7.1). Pure.
 *
 * - Typed blocks (setting, character, arc, ending, location, voice) become Brief
 *   items. Their child `field` blocks fill typed properties; custom fields
 *   become `keyFacts`; Hidden fields are listed in `hiddenFields` (typed) or
 *   flagged on the key fact (custom).
 * - Arcs keep document order.
 * - Paragraphs, lists and quotes outside typed blocks are free prose, grouped
 *   under the nearest preceding heading.
 * - The draft is validated against the §7.1 rules with zod; every issue carries
 *   the block id and field so the editor can highlight it.
 */
import {
  validateBriefDraft,
  type BriefArc,
  type BriefCharacter,
  type BriefDraft,
  type BriefEnding,
  type BriefIssue,
  type BriefLocation,
  type BriefProseSection,
  type BriefSetting,
  type BriefValidation,
  type BriefVoice,
  type KeyFact,
} from "@/domain/brief"
import {
  BRIEF_BLOCKS,
  CUSTOM_FIELD_KEY,
  isBriefBlockType,
  type BriefBlockType,
} from "@/brief/fields"
import { inlineToText, normaliseFieldText, splitList } from "@/editor/inline-text"
import type { FieldBlock, SandsBlock } from "@/editor/schema-config"

export type BriefConversion = {
  /** Everything the document holds, valid or not. */
  draft: BriefDraft
  /** The §7.1 verdict: the validated Brief, or every issue. */
  validation: BriefValidation
  /** Issues from the §7.1 rules plus structural ones (a field outside any typed block). */
  issues: BriefIssue[]
  /** `typed block id -> field key -> field block id`, for focusing a field. */
  fieldBlockIds: Record<string, Record<string, string>>
}

type ReadFields = {
  values: Record<string, string>
  keyFacts: KeyFact[]
  hiddenFields: string[]
  fieldBlockIds: Record<string, string>
  /** Non-field children, which count as free prose. */
  strays: SandsBlock[]
}

/** Reads a typed block's child field blocks. */
export function readFields(block: SandsBlock): ReadFields {
  const out: ReadFields = { values: {}, keyFacts: [], hiddenFields: [], fieldBlockIds: {}, strays: [] }
  for (const child of block.children) {
    if (child.type !== "field") {
      out.strays.push(child)
      continue
    }
    const text = fieldText(child)
    const { key, label, hidden } = child.props
    if (key === CUSTOM_FIELD_KEY) {
      if (label.trim() === "" && text === "") continue
      out.keyFacts.push({ label: label.trim(), text, hidden })
      continue
    }
    // Two blocks with one key (a paste, a drag) join rather than overwrite.
    out.values[key] = out.values[key] ? `${out.values[key]}\n${text}` : text
    out.fieldBlockIds[key] ??= child.id
    if (hidden && !out.hiddenFields.includes(key)) out.hiddenFields.push(key)
  }
  return out
}

/** A field's text: its own content, then any blocks nested under it, one paragraph each. */
export function fieldText(field: FieldBlock | SandsBlock): string {
  const own = field.type === "field" ? inlineToText(field.content) : ""
  const nested = field.children.map((child) => blockText(child)).filter(Boolean)
  return normaliseFieldText([own, ...nested].join("\n"))
}

function blockText(block: SandsBlock): string {
  const own = Array.isArray(block.content) ? inlineToText(block.content as never) : ""
  const nested = block.children.map((child) => blockText(child)).filter(Boolean)
  return [own, ...nested].filter(Boolean).join("\n")
}

function list(values: Record<string, string>, type: BriefBlockType, key: string): string[] {
  const spec = BRIEF_BLOCKS[type].fields.find((field) => field.key === key)
  return splitList(values[key] ?? "", spec?.list ?? "lines")
}

export function documentToBrief(document: readonly SandsBlock[]): BriefConversion {
  const draft: BriefDraft = {
    settings: [],
    characters: [],
    arcs: [],
    endings: [],
    locations: [],
    voices: [],
    prose: [],
  }
  const fieldBlockIds: Record<string, Record<string, string>> = {}
  const structural: BriefIssue[] = []

  let section: BriefProseSection = { heading: null, headingBlockId: null, paragraphs: [] }
  const flushSection = () => {
    if (section.paragraphs.length > 0 || section.heading) draft.prose.push(section)
  }

  const addProse = (block: SandsBlock, depth: number) => {
    const text = Array.isArray(block.content) ? inlineToText(block.content as never).trim() : ""
    if (text) {
      const indent = "  ".repeat(depth)
      const marker =
        block.type === "bulletListItem"
          ? "- "
          : block.type === "numberedListItem"
            ? "1. "
            : block.type === "quote"
              ? "> "
              : ""
      section.paragraphs.push(`${indent}${marker}${text}`)
    }
    for (const child of block.children) visit(child, depth + 1)
  }

  const addTyped = (block: SandsBlock, type: BriefBlockType) => {
    const fields = readFields(block)
    fieldBlockIds[block.id] = fields.fieldBlockIds
    const base = { blockId: block.id, keyFacts: fields.keyFacts, hiddenFields: fields.hiddenFields }
    const v = (key: string) => fields.values[key] ?? ""

    switch (type) {
      case "setting":
        draft.settings.push({ ...base, place: v("place"), period: v("period") } satisfies BriefSetting)
        break
      case "character":
        draft.characters.push({
          ...base,
          name: v("name"),
          role: v("role"),
          age: v("age"),
          personality: v("personality"),
          backstory: v("backstory"),
          aliases: list(fields.values, "character", "aliases"),
          isPlayer: block.type === "character" && block.props.isPlayer,
        } satisfies BriefCharacter)
        break
      case "arc":
        draft.arcs.push({
          ...base,
          name: v("name"),
          description: v("description"),
          exitConditions: list(fields.values, "arc", "exitConditions"),
        } satisfies BriefArc)
        break
      case "ending":
        draft.endings.push({ ...base, condition: v("condition") } satisfies BriefEnding)
        break
      case "location":
        draft.locations.push({ ...base, name: v("name"), description: v("description") } satisfies BriefLocation)
        break
      case "voice":
        draft.voices.push({
          ...base,
          guidelines: v("guidelines"),
          samplePassages: v("samplePassages"),
        } satisfies BriefVoice)
        break
    }
    for (const stray of fields.strays) visit(stray, 0)
  }

  function visit(block: SandsBlock, depth: number) {
    if (isBriefBlockType(block.type)) {
      addTyped(block, block.type)
      return
    }
    switch (block.type) {
      case "heading":
        flushSection()
        section = {
          heading: inlineToText(block.content).trim(),
          headingBlockId: block.id,
          paragraphs: [],
        }
        for (const child of block.children) visit(child, depth + 1)
        return
      case "paragraph":
      case "bulletListItem":
      case "numberedListItem":
      case "quote":
        addProse(block, depth)
        return
      case "field": {
        structural.push({
          code: "field_outside_block",
          message: `The field "${block.props.label || block.props.key}" sits outside any typed block. Move it back into one, or delete it.`,
          blockId: block.id,
          field: block.props.key,
          fieldBlockId: block.id,
        })
        return
      }
      default:
        // Entry blocks and group headings belong to the Entry surface; a Brief ignores them.
        return
    }
  }

  for (const block of document) visit(block, 0)
  flushSection()

  const validation = validateBriefDraft(draft, fieldBlockIds)
  const issues = [...structural, ...validation.issues]
  return {
    draft,
    validation:
      structural.length > 0 && validation.success
        ? { success: false, brief: null, issues }
        : validation.success
          ? validation
          : { success: false, brief: null, issues },
    issues,
    fieldBlockIds,
  }
}
