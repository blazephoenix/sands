/**
 * Entries <-> Entry sections (spec §7.2, editor-design.md). Pure.
 *
 * An Entry is a heading block (one type per kind; its id is the Entry's id, its
 * text is the name, its props carry source, status and Jev flags) followed by
 * `Label: value` paragraphs: Description, the kind's data (`Red herring: yes`,
 * `Min band: normal`, `Requires: @C1, @C3`) and custom fields (key facts).
 * Reading a section back validates each value by kind and reports bad ones
 * against the paragraph that holds them.
 */
import { z } from "zod"

import { randomId, type IdFactory } from "@/brief/to-document"
import {
  ENTRY_GROUP_OF,
  ENTRY_KINDS_BY_GROUP,
  entryContentSchema,
  formatKeyFact,
  hasHiddenFields,
  jevFlagSchema,
  type Entry,
  type EntryContent,
  type EntryGroup,
  type EntryKind,
  type EntrySource,
  type EntryStatus,
  type JevFlag,
} from "@/domain/entry"

import {
  ENTRY_FIELDS,
  entryKindHasHiddenFields,
  type EntryFieldSpec,
} from "./entry-fields"
import {
  fieldParagraph,
  matchLabel,
  walkSections,
  type WalkedField,
} from "./field-line"
import { inlineToText, mentionedEntryIds, splitList } from "./inline-text"
import {
  ENTRY_BLOCK_TYPE,
  ENTRY_KIND_OF_BLOCK,
  isEntryBlockType,
  type EntryBlock,
  type SandsBlock,
  type SandsInline,
} from "./schema-config"

type NameOf = (entryId: string) => string | undefined
type KindOf = (entryId: string) => EntryKind | undefined

/** Splits "Label: text" back into a custom field. A key fact without a label keeps an empty label. */
export function parseKeyFact(fact: string): { label: string; text: string } {
  const match = /^([^:\n]{1,40}):\s*([\s\S]*)$/u.exec(fact)
  return match
    ? { label: match[1].trim(), text: match[2] }
    : { label: "", text: fact }
}

function mentions(ids: readonly string[], nameOf: NameOf): SandsInline[] {
  const out: SandsInline[] = []
  ids.forEach((id, index) => {
    if (index > 0) out.push({ type: "text", text: ", ", styles: {} })
    out.push({
      type: "entryMention",
      props: { entryId: id, label: nameOf(id) ?? id },
      content: undefined,
    })
  })
  return out
}

function enumSpelling(spec: EntryFieldSpec, value: string) {
  return (
    Object.entries(spec.values ?? {}).find(([, data]) => data === value)?.[0] ??
    value
  )
}

/** The value of one known field, as document content. */
function fieldValue(
  entry: Entry,
  spec: EntryFieldSpec,
  nameOf: NameOf
): string | SandsInline[] {
  const raw =
    spec.key === "description"
      ? entry.description
      : (entry.data as Record<string, unknown>)[spec.key]
  switch (spec.type) {
    case "text":
      return typeof raw === "string" ? raw : ""
    case "list":
      return Array.isArray(raw) ? raw.join(", ") : ""
    case "ref":
      return typeof raw === "string" && raw ? mentions([raw], nameOf) : []
    case "refs":
      return Array.isArray(raw) ? mentions(raw as string[], nameOf) : []
    case "boolean":
      return raw ? "yes" : "no"
    case "number":
      return raw === null || raw === undefined ? "all" : String(raw)
    case "enum":
      return enumSpelling(spec, String(raw))
    case "arc":
      return String((raw as number) + 1)
  }
}

/** An Entry heading block with the Entry's id, name and header props. */
export function entryHeading(
  entry: Pick<
    Entry,
    "id" | "kind" | "name" | "source" | "status" | "sourceTurn" | "jevFlags"
  >
): EntryBlock {
  return {
    id: entry.id,
    type: ENTRY_BLOCK_TYPE[entry.kind],
    props: {
      entryId: entry.id,
      source: entry.source,
      status: entry.status,
      sourceTurn: entry.sourceTurn ?? -1,
      jevFlags: JSON.stringify(entry.jevFlags),
    },
    content: entry.name ? [{ type: "text", text: entry.name, styles: {} }] : [],
    children: [],
  } as EntryBlock
}

/** An Entry as its heading plus one `Label:` line per known field, then its custom fields. */
export function entryToBlocks(
  entry: Entry,
  options: { nameOf?: NameOf; ids?: IdFactory } = {}
): SandsBlock[] {
  const nameOf = options.nameOf ?? (() => undefined)
  const ids = options.ids ?? randomId
  const hidden = new Set(hasHiddenFields(entry) ? entry.data.hiddenFields : [])
  const blocks: SandsBlock[] = [entryHeading(entry)]
  for (const spec of ENTRY_FIELDS[entry.kind]) {
    blocks.push(
      fieldParagraph(
        `${entry.id}:${spec.key}`,
        spec.label,
        fieldValue(entry, spec, nameOf),
        hidden.has(spec.key) ? { hidden: true } : {}
      )
    )
  }
  for (const fact of entry.keyFacts) {
    const { label, text } = parseKeyFact(fact)
    blocks.push(
      fieldParagraph(
        ids(),
        label || "Note",
        text,
        label && hidden.has(label) ? { hidden: true } : {}
      )
    )
  }
  return blocks
}

const EMPTY_DATA: Record<EntryKind, Record<string, unknown>> = {
  location: { connections: [], isStart: false },
  character: {
    role: "",
    age: "",
    personality: "",
    backstory: "",
    isPlayer: false,
    hiddenFields: [],
    aliases: [],
  },
  npc: {
    role: "",
    age: "",
    personality: "",
    backstory: "",
    isPlayer: false,
    hiddenFields: [],
    aliases: [],
  },
  faction: {},
  clue: {
    locationId: null,
    knownBy: [],
    reveals: "",
    pointsToHidden: false,
    redHerring: false,
  },
  object: {},
  exit_condition: { arcIndex: 0, condition: "" },
  knowledge: { characterId: "", fact: "", minBand: "normal", clueId: null },
  decisive_action: {
    verb: "",
    correctTargetId: "",
    requires: [],
    requiresCount: null,
    onSuccess: "win",
    wrongTargetPenalty: 15,
    prematurePenalty: 20,
  },
}

/** An empty Entry section for the slash menu: authored by the Author, accepted, not stored yet. */
export function newEntrySection(
  kind: EntryKind,
  ids: IdFactory = randomId
): SandsBlock[] {
  const blockId = ids()
  const [heading, ...fields] = entryToBlocks(
    {
      id: blockId,
      kind,
      name: "",
      description: "",
      keyFacts: [],
      data: structuredClone(EMPTY_DATA[kind]),
      source: "author",
      sourceTurn: null,
      status: "accepted",
      jevFlags: [],
    } as unknown as Entry,
    { ids }
  )
  return [
    { ...heading, props: { ...heading.props, entryId: "" } } as SandsBlock,
    ...fields,
  ]
}

/** A problem that stops a section becoming a valid Entry. */
export type EntryBlockIssue = {
  /** The Entry heading. */
  blockId: string
  /** Field key, or null for the whole Entry. */
  field: string | null
  /** The paragraph to highlight (the heading for the name). */
  fieldBlockId: string | null
  message: string
}

/** Something to point out that does not block the Entry: a probable label typo. */
export type EntryBlockWarning = {
  blockId: string
  fieldBlockId: string
  label: string
  suggestion: string
  message: string
}

export type EntryBlockConversion = {
  /** The heading's block id (the Entry id for stored Entries). */
  blockId: string
  /** Empty for an Entry not stored yet. */
  entryId: string
  kind: EntryKind
  source: EntrySource
  status: EntryStatus
  sourceTurn: number | null
  jevFlags: JevFlag[]
  /** Heading and field paragraph ids, in order: everything that belongs to this Entry. */
  blockIds: string[]
  /** The Entry's editable content, or null if the section has issues. */
  content: EntryContent | null
  issues: EntryBlockIssue[]
  warnings: EntryBlockWarning[]
}

function parseFlags(json: string): JevFlag[] {
  try {
    return z.array(jevFlagSchema).parse(JSON.parse(json))
  } catch {
    return []
  }
}

const YES = /^(yes|y|true)$/iu
const NO = /^(no|n|false)$/iu

/** Reads one Entry section back into content, validating each value by kind. */
export function sectionToEntry(
  heading: EntryBlock,
  fields: readonly WalkedField[],
  options: { kindOf?: KindOf } = {}
): EntryBlockConversion {
  const kind = ENTRY_KIND_OF_BLOCK[heading.type]
  const specs = ENTRY_FIELDS[kind]
  const hideable = entryKindHasHiddenFields(kind)
  const issues: EntryBlockIssue[] = []
  const warnings: EntryBlockWarning[] = []
  const data: Record<string, unknown> = structuredClone(EMPTY_DATA[kind])
  const fieldIds: Record<string, string> = {}
  const keyFacts: string[] = []
  const hiddenFields: string[] = []
  let description = ""

  const issue = (spec: EntryFieldSpec, blockId: string, message: string) =>
    issues.push({
      blockId: heading.id,
      field: spec.key,
      fieldBlockId: blockId,
      message,
    })

  for (const { block, line } of fields) {
    const match = matchLabel(line.label, specs)
    if (match.kind !== "known") {
      if (match.kind === "typo") {
        warnings.push({
          blockId: heading.id,
          fieldBlockId: block.id,
          label: line.label,
          suggestion: match.suggestion.label,
          message: `"${line.label}" looks like a typo for "${match.suggestion.label}". As written it is a custom field.`,
        })
      }
      if (line.text) {
        keyFacts.push(formatKeyFact(line.label, line.text))
        if (hideable && line.hidden) hiddenFields.push(line.label)
      }
      continue
    }

    const spec = match.spec
    fieldIds[spec.key] ??= block.id
    const text = line.text.trim()
    switch (spec.type) {
      case "text":
        if (spec.key === "description")
          description = description ? `${description}\n${line.text}` : line.text
        else
          data[spec.key] = data[spec.key]
            ? `${data[spec.key]}\n${line.text}`
            : line.text
        if (hideable && line.hidden && !hiddenFields.includes(spec.key))
          hiddenFields.push(spec.key)
        break
      case "list":
        data[spec.key] = [
          ...((data[spec.key] as string[]) ?? []),
          ...splitList(line.text, "comma"),
        ]
        break
      case "ref":
      case "refs": {
        const ids = mentionedEntryIds(line.value)
        const leftover = inlineToText(
          line.value.filter((node) => node.type !== "entryMention")
        ).replace(/[,\s]/gu, "")
        if (leftover)
          issue(
            spec,
            block.id,
            `${spec.label} takes @ mentions only. Type @ to pick an Entry.`
          )
        if (spec.kinds && options.kindOf) {
          for (const id of ids) {
            const found = options.kindOf(id)
            if (found && !spec.kinds.includes(found)) {
              issue(
                spec,
                block.id,
                `${spec.label} can only point at ${spec.kinds.map((k) => k.replaceAll("_", " ")).join(" or ")} Entries.`
              )
            }
          }
        }
        if (spec.type === "refs") {
          data[spec.key] = [...((data[spec.key] as string[]) ?? []), ...ids]
        } else {
          if (ids.length > 1)
            issue(
              spec,
              block.id,
              `${spec.label} takes one Entry. Remove the others.`
            )
          data[spec.key] =
            ids[0] ??
            (spec.key === "characterId" || spec.key === "correctTargetId"
              ? ""
              : null)
        }
        break
      }
      case "boolean":
        if (!text) break
        if (YES.test(text)) data[spec.key] = true
        else if (NO.test(text)) data[spec.key] = false
        else issue(spec, block.id, `${spec.label} takes yes or no.`)
        break
      case "number": {
        if (!text) break
        if (spec.key === "requiresCount" && /^all$/iu.test(text)) {
          data[spec.key] = null
          break
        }
        const value = Number(text)
        if (!Number.isInteger(value))
          issue(
            spec,
            block.id,
            `${spec.label} takes a whole number${spec.key === "requiresCount" ? ' or "all"' : ""}.`
          )
        else if (spec.key === "requiresCount" && value < 1)
          issue(spec, block.id, `${spec.label} takes "all" or a number from 1.`)
        else data[spec.key] = value
        break
      }
      case "enum": {
        if (!text) break
        const value = spec.values?.[text.toLowerCase()]
        if (value === undefined)
          issue(
            spec,
            block.id,
            `${spec.label} takes ${Object.keys(spec.values ?? {}).join(", ")}.`
          )
        else data[spec.key] = value
        break
      }
      case "arc": {
        if (!text) break
        const value = Number(text)
        if (!Number.isInteger(value) || value < 1)
          issue(spec, block.id, `${spec.label} takes an Arc number from 1.`)
        else data[spec.key] = value - 1
        break
      }
    }
  }

  for (const spec of specs) {
    if (
      spec.required &&
      !data[spec.key] &&
      !issues.some((i) => i.field === spec.key)
    ) {
      issues.push({
        blockId: heading.id,
        field: spec.key,
        fieldBlockId: fieldIds[spec.key] ?? heading.id,
        message: `${spec.label} needs an Entry. Type @ to pick one.`,
      })
    }
  }
  if (hideable) data.hiddenFields = hiddenFields
  if (kind === "npc") data.isPlayer = false

  const name = inlineToText((heading.content ?? []) as SandsInline[]).trim()
  let content: EntryContent | null = null
  if (issues.length === 0) {
    const parsed = entryContentSchema.safeParse({
      kind,
      name,
      description,
      keyFacts,
      data,
    })
    if (parsed.success) {
      content = parsed.data
    } else {
      for (const zodIssue of parsed.error.issues) {
        const field =
          typeof zodIssue.path[1] === "string" ? zodIssue.path[1] : null
        issues.push({
          blockId: heading.id,
          field,
          fieldBlockId: field ? (fieldIds[field] ?? heading.id) : heading.id,
          message: zodIssue.message,
        })
      }
    }
  }

  const props = heading.props
  return {
    blockId: heading.id,
    entryId: props.entryId,
    kind,
    source: props.source as EntrySource,
    status: props.status as EntryStatus,
    sourceTurn: props.sourceTurn >= 0 ? props.sourceTurn : null,
    jevFlags: parseFlags(props.jevFlags),
    blockIds: [heading.id, ...fields.map((field) => field.block.id)],
    content,
    issues,
    warnings,
  }
}

function isEntryHeading(block: SandsBlock): block is EntryBlock {
  return isEntryBlockType(block.type)
}

/** Every Entry heading in a document, in order. */
export function entryBlocksOf(document: readonly SandsBlock[]): EntryBlock[] {
  return walkSections(document, isEntryHeading).flatMap((item) =>
    item.type === "section" ? [item.heading] : []
  )
}

/** Every Entry section in a document, read back and validated. */
export function documentToEntries(
  document: readonly SandsBlock[],
  options: { kindOf?: KindOf } = {}
): EntryBlockConversion[] {
  return walkSections(document, isEntryHeading).flatMap((item) =>
    item.type === "section"
      ? [sectionToEntry(item.heading, item.fields, options)]
      : []
  )
}

/** A World / Story logic divider. */
export function groupDivider(group: EntryGroup): SandsBlock {
  return {
    id: `group:${group}`,
    type: "entryGroup",
    props: { group },
    content: undefined,
    children: [],
  }
}

/**
 * The Entry surface's document: a World divider, then its Entries by kind, a
 * Story logic divider, then its Entries by kind. Within a kind, the given order.
 */
export function entriesToDocument(
  entries: readonly Entry[],
  options: { nameOf?: NameOf } = {}
): SandsBlock[] {
  const byId = new Map(entries.map((entry) => [entry.id, entry]))
  const nameOf: NameOf = options.nameOf ?? ((id) => byId.get(id)?.name)
  const doc: SandsBlock[] = []
  for (const group of ["world", "story_logic"] as const) {
    const inGroup = entries.filter(
      (entry) => ENTRY_GROUP_OF[entry.kind] === group
    )
    if (inGroup.length === 0) continue
    doc.push(groupDivider(group))
    for (const kind of ENTRY_KINDS_BY_GROUP[group]) {
      for (const entry of inGroup.filter((e) => e.kind === kind))
        doc.push(...entryToBlocks(entry, { nameOf }))
    }
  }
  return doc
}
