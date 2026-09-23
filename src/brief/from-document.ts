/**
 * Brief editor document -> Brief (spec §7.1, editor-design.md). Pure.
 *
 * - A section heading (setting, character, ...) starts a Brief item. Named
 *   kinds take their name from the heading's text.
 * - The `Label: value` paragraphs after it are its fields. Labels match
 *   case-insensitively; unknown labels are custom fields and become key facts;
 *   a near miss of a known label is reported as a probable typo.
 * - A value carrying the Hidden style makes the field Hidden.
 * - Anything else is free prose: it ends the section and is grouped under the
 *   nearest preceding standard heading.
 * - Arcs keep document order.
 * - The draft is validated against the §7.1 rules with zod; every issue
 *   carries the block id and field.
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
  type BriefWarning,
  type KeyFact,
} from "@/domain/brief"
import {
  BRIEF_BLOCKS,
  isBriefBlockType,
  type BriefBlockType,
} from "@/brief/fields"
import {
  hasHiddenStyle,
  matchLabel,
  walkSections,
  type WalkedField,
} from "@/editor/field-line"
import {
  inlineToText,
  normaliseFieldText,
  splitList,
} from "@/editor/inline-text"
import type {
  BriefSectionBlock,
  SandsBlock,
  SandsInline,
} from "@/editor/schema-config"

export type BriefConversion = {
  /** Everything the document holds, valid or not. */
  draft: BriefDraft
  /** The §7.1 verdict: the validated Brief, or every issue. */
  validation: BriefValidation
  /** The §7.1 issues (same as `validation.issues`). */
  issues: BriefIssue[]
  /** Non-blocking: probable label typos, unnamed sections. */
  warnings: BriefWarning[]
  /** `heading block id -> field key -> field paragraph id` (the heading itself for `name`). */
  fieldBlockIds: Record<string, Record<string, string>>
}

type ReadSection = {
  values: Record<string, string>
  keyFacts: KeyFact[]
  hiddenFields: string[]
  fieldBlockIds: Record<string, string>
}

function isBriefHeading(block: SandsBlock): block is BriefSectionBlock {
  return isBriefBlockType(block.type)
}

/** Reads one section's fields against its kind's known labels. */
function readSection(
  heading: BriefSectionBlock,
  fields: WalkedField[],
  warnings: BriefWarning[]
): ReadSection {
  const type = heading.type as BriefBlockType
  const spec = BRIEF_BLOCKS[type]
  const out: ReadSection = {
    values: {},
    keyFacts: [],
    hiddenFields: [],
    fieldBlockIds: {},
  }

  if (spec.named) {
    const content = (heading.content ?? []) as SandsInline[]
    out.values.name = inlineToText(content).trim()
    out.fieldBlockIds.name = heading.id
    if (hasHiddenStyle(content)) out.hiddenFields.push("name")
    if (!out.values.name && type !== "character") {
      warnings.push({
        code: "unnamed_section",
        message: `This ${spec.title} has no name. Type one on the heading line.`,
        blockId: heading.id,
        field: null,
        suggestion: null,
      })
    }
  }

  for (const { block, line } of fields) {
    const match = matchLabel(line.label, spec.fields)
    if (match.kind === "known") {
      const { key } = match.spec
      const separator = match.spec.list === "comma" ? ", " : "\n"
      out.values[key] =
        out.values[key] && line.text
          ? `${out.values[key]}${separator}${line.text}`
          : out.values[key] || line.text
      out.fieldBlockIds[key] ??= block.id
      if (line.hidden && !out.hiddenFields.includes(key))
        out.hiddenFields.push(key)
      continue
    }
    if (match.kind === "typo") {
      warnings.push({
        code: "probable_typo",
        message: `"${line.label}" looks like a typo for "${match.suggestion.label}". As written it is a custom field.`,
        blockId: block.id,
        field: line.label,
        suggestion: match.suggestion.label,
      })
    }
    if (line.text)
      out.keyFacts.push({
        label: line.label,
        text: line.text,
        hidden: line.hidden,
      })
  }
  return out
}

function list(
  values: Record<string, string>,
  type: BriefBlockType,
  key: string
): string[] {
  const spec = BRIEF_BLOCKS[type].fields.find((field) => field.key === key)
  return splitList(values[key] ?? "", spec?.list ?? "lines")
}

function proseText(block: SandsBlock, depth: number): string {
  const text = Array.isArray(block.content)
    ? inlineToText(block.content as SandsInline[]).trim()
    : ""
  if (!text) return ""
  const marker =
    block.type === "bulletListItem"
      ? "- "
      : block.type === "numberedListItem"
        ? "1. "
        : block.type === "quote"
          ? "> "
          : ""
  return `${"  ".repeat(depth)}${marker}${normaliseFieldText(text)}`
}

export function documentToBrief(
  document: readonly SandsBlock[]
): BriefConversion {
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
  const warnings: BriefWarning[] = []

  let section: BriefProseSection = {
    heading: null,
    headingBlockId: null,
    paragraphs: [],
  }
  const flush = () => {
    if (section.paragraphs.length > 0 || section.heading)
      draft.prose.push(section)
  }

  for (const item of walkSections(document, isBriefHeading)) {
    if (item.type === "prose") {
      const { block, depth } = item
      if (block.type === "heading") {
        flush()
        section = {
          heading: inlineToText(block.content as SandsInline[]).trim(),
          headingBlockId: block.id,
          paragraphs: [],
        }
        continue
      }
      const text = proseText(block, depth)
      if (text) section.paragraphs.push(text)
      continue
    }

    const { heading, fields } = item
    const type = heading.type as BriefBlockType
    const read = readSection(heading, fields, warnings)
    fieldBlockIds[heading.id] = read.fieldBlockIds
    const base = {
      blockId: heading.id,
      keyFacts: read.keyFacts,
      hiddenFields: read.hiddenFields,
    }
    const v = (key: string) => read.values[key] ?? ""

    switch (type) {
      case "setting":
        draft.settings.push({
          ...base,
          place: v("place"),
          period: v("period"),
        } satisfies BriefSetting)
        break
      case "character":
        draft.characters.push({
          ...base,
          name: v("name"),
          role: v("role"),
          age: v("age"),
          personality: v("personality"),
          backstory: v("backstory"),
          aliases: list(read.values, "character", "aliases"),
          isPlayer: heading.type === "character" && heading.props.isPlayer,
        } satisfies BriefCharacter)
        break
      case "arc":
        draft.arcs.push({
          ...base,
          name: v("name"),
          description: v("description"),
          exitConditions: list(read.values, "arc", "exitConditions"),
        } satisfies BriefArc)
        break
      case "ending":
        draft.endings.push({
          ...base,
          condition: v("condition"),
        } satisfies BriefEnding)
        break
      case "location":
        draft.locations.push({
          ...base,
          name: v("name"),
          description: v("description"),
        } satisfies BriefLocation)
        break
      case "voice":
        draft.voices.push({
          ...base,
          guidelines: v("guidelines"),
          samplePassages: v("samplePassages"),
        } satisfies BriefVoice)
        break
    }
  }
  flush()

  const validation = validateBriefDraft(draft, fieldBlockIds)
  return {
    draft,
    validation,
    issues: validation.issues,
    warnings,
    fieldBlockIds,
  }
}
