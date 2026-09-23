/**
 * Entries <-> Entry blocks (spec §7.2). Pure.
 *
 * An Entry block's id is its Entry's id, so a page can find, scroll to and
 * highlight an Entry by id. Its header props carry source, status, Jev flags
 * and scalar kind data; its child field blocks carry text, references (as Entry
 * mentions) and custom fields (the Entry's `keyFacts`).
 */
import { z } from "zod"

import { CUSTOM_FIELD_KEY } from "@/brief/fields"
import { fieldBlock, randomId, type IdFactory } from "@/brief/to-document"
import {
  ENTRY_GROUP_OF,
  ENTRY_KINDS_BY_GROUP,
  entryContentSchema,
  hasHiddenFields,
  formatKeyFact,
  jevFlagSchema,
  type Entry,
  type EntryContent,
  type EntryKind,
  type EntrySource,
  type EntryStatus,
  type JevFlag,
} from "@/domain/entry"

import { ENTRY_FIELDS, entryFieldSpecFor, type EntryFieldSpec } from "./entry-fields"
import { fieldText } from "@/brief/from-document"
import { mentionedEntryIds } from "./inline-text"
import {
  ENTRY_BLOCK_TYPE,
  ENTRY_KIND_OF_BLOCK,
  isEntryBlockType,
  type EntryBlock,
  type FieldBlock,
  type SandsBlock,
} from "./schema-config"

type NameOf = (entryId: string) => string | undefined

/** Splits "Label: text" back into a custom field. A key fact without a label keeps an empty label. */
export function parseKeyFact(fact: string): { label: string; text: string } {
  const match = /^([^:\n]{1,60}):\s*([\s\S]*)$/u.exec(fact)
  return match ? { label: match[1].trim(), text: match[2] } : { label: "", text: fact }
}

function mentionContent(ids: readonly string[], nameOf: NameOf) {
  const out: FieldBlock["content"] = []
  ids.forEach((id, i) => {
    if (i > 0) out.push({ type: "text", text: " ", styles: {} })
    out.push({ type: "entryMention", props: { entryId: id, label: nameOf(id) ?? id }, content: undefined })
  })
  return out
}

function refIds(entry: Entry, key: string): string[] {
  const data = entry.data as Record<string, unknown>
  const value = data[key]
  if (Array.isArray(value)) return value as string[]
  return typeof value === "string" && value ? [value] : []
}

function textValue(entry: Entry, key: string): string {
  if (key === "name") return entry.name
  if (key === "description") return entry.description
  const value = (entry.data as Record<string, unknown>)[key]
  if (Array.isArray(value)) return value.join(", ")
  return typeof value === "string" ? value : ""
}

/** Header props for an Entry block, including its kind's scalar data. */
function entryProps(entry: Entry): EntryBlock["props"] {
  const base = {
    entryId: entry.id,
    source: entry.source,
    status: entry.status,
    sourceTurn: entry.sourceTurn ?? -1,
    jevFlags: JSON.stringify(entry.jevFlags),
  }
  switch (entry.kind) {
    case "location":
      return { ...base, isStart: entry.data.isStart }
    case "character":
      return { ...base, isPlayer: entry.data.isPlayer }
    case "clue":
      return { ...base, pointsToHidden: entry.data.pointsToHidden, redHerring: entry.data.redHerring }
    case "exit_condition":
      return { ...base, arcIndex: entry.data.arcIndex }
    case "knowledge":
      return { ...base, minBand: entry.data.minBand }
    case "decisive_action":
      return {
        ...base,
        onSuccess: entry.data.onSuccess,
        requiresCount: entry.data.requiresCount ?? 0,
        wrongTargetPenalty: entry.data.wrongTargetPenalty,
        prematurePenalty: entry.data.prematurePenalty,
      }
    default:
      return base
  }
}

export function entryToBlock(entry: Entry, options: { nameOf?: NameOf; ids?: IdFactory } = {}): EntryBlock {
  const ids = options.ids ?? randomId
  const nameOf = options.nameOf ?? (() => undefined)
  const hidden = hasHiddenFields(entry) ? entry.data.hiddenFields : []

  const children: FieldBlock[] = ENTRY_FIELDS[entry.kind].map((spec) => {
    const id = `${entry.id}:${spec.key}`
    if (spec.ref) {
      return { ...fieldBlock(id, spec.key, spec.label, ""), content: mentionContent(refIds(entry, spec.key), nameOf) }
    }
    return fieldBlock(id, spec.key, spec.label, textValue(entry, spec.key), hidden.includes(spec.key))
  })
  for (const fact of entry.keyFacts) {
    const { label, text } = parseKeyFact(fact)
    children.push(fieldBlock(ids(), CUSTOM_FIELD_KEY, label, text, label !== "" && hidden.includes(label)))
  }

  return {
    id: entry.id,
    type: ENTRY_BLOCK_TYPE[entry.kind],
    props: entryProps(entry),
    content: undefined,
    children,
  } as EntryBlock
}

/** An empty Entry block for the slash menu: authored by the Author, accepted, not yet stored. */
export function newEntryBlock(kind: EntryKind, ids: IdFactory = randomId): EntryBlock {
  const block = entryToBlock({ ...EMPTY_ENTRY_DATA[kind], id: ids() } as Entry, { ids })
  return { ...block, props: { ...block.props, entryId: "", source: "author", status: "accepted" } } as EntryBlock
}

const now = "1970-01-01T00:00:00.000Z"
const baseEmpty = {
  worldId: "",
  sessionId: null,
  templateId: null,
  name: "",
  description: "",
  keyFacts: [],
  source: "author" as const,
  sourceTurn: null,
  status: "accepted" as const,
  jevFlags: [],
  seenAt: null,
  createdAt: now,
  updatedAt: now,
}
const person = { role: "", age: "", personality: "", backstory: "", isPlayer: false, hiddenFields: [], aliases: [] }
const EMPTY_ENTRY_DATA: Record<EntryKind, Omit<Entry, "id">> = {
  location: { ...baseEmpty, kind: "location", data: { connections: [], isStart: false } },
  character: { ...baseEmpty, kind: "character", data: person },
  npc: { ...baseEmpty, kind: "npc", data: person },
  faction: { ...baseEmpty, kind: "faction", data: {} },
  clue: {
    ...baseEmpty,
    kind: "clue",
    data: { locationId: null, knownBy: [], reveals: "", pointsToHidden: false, redHerring: false },
  },
  object: { ...baseEmpty, kind: "object", data: {} },
  exit_condition: { ...baseEmpty, kind: "exit_condition", data: { arcIndex: 0, condition: "" } },
  knowledge: {
    ...baseEmpty,
    kind: "knowledge",
    data: { characterId: "", fact: "", minBand: "normal", clueId: null },
  },
  decisive_action: {
    ...baseEmpty,
    kind: "decisive_action",
    data: {
      verb: "",
      correctTargetId: "",
      requires: [],
      requiresCount: null,
      onSuccess: "win",
      wrongTargetPenalty: 15,
      prematurePenalty: 20,
    },
  },
}

/** A problem in an Entry block that stops it becoming a valid Entry. */
export type EntryBlockIssue = {
  blockId: string
  /** Field key, or null for the whole block. */
  field: string | null
  fieldBlockId: string | null
  message: string
}

export type EntryBlockConversion = {
  blockId: string
  /** Empty for an Entry not stored yet. */
  entryId: string
  kind: EntryKind
  source: EntrySource
  status: EntryStatus
  sourceTurn: number | null
  jevFlags: JevFlag[]
  /** The Entry's editable content, or null if the block has issues. */
  content: EntryContent | null
  issues: EntryBlockIssue[]
}

function parseFlags(json: string): JevFlag[] {
  try {
    return z.array(jevFlagSchema).parse(JSON.parse(json))
  } catch {
    return []
  }
}

/** Reads an Entry block back into an Entry's content, validated by kind with zod. */
export function blockToEntry(block: EntryBlock, options: { kindOf?: (entryId: string) => EntryKind | undefined } = {}): EntryBlockConversion {
  const kind = ENTRY_KIND_OF_BLOCK[block.type]
  const props = block.props as Record<string, unknown>
  const issues: EntryBlockIssue[] = []
  const values: Record<string, string> = {}
  const refs: Record<string, string[]> = {}
  const fieldIds: Record<string, string> = {}
  const keyFacts: string[] = []
  const hiddenFields: string[] = []
  const hideable = kind === "character" || kind === "npc"

  for (const child of block.children) {
    if (child.type !== "field") continue
    const { key, label, hidden } = child.props
    if (key === CUSTOM_FIELD_KEY) {
      const text = fieldText(child)
      if (label.trim() === "" && text === "") continue
      keyFacts.push(formatKeyFact(label, text))
      if (hideable && hidden && label.trim()) hiddenFields.push(label.trim())
      continue
    }
    fieldIds[key] ??= child.id
    const spec = entryFieldSpecFor(kind, key)
    if (spec?.ref) {
      refs[key] = [...(refs[key] ?? []), ...mentionedEntryIds(child.content)]
    } else {
      const text = fieldText(child)
      values[key] = values[key] ? `${values[key]}\n${text}` : text
      if (hideable && hidden && !hiddenFields.includes(key)) hiddenFields.push(key)
    }
  }

  const refValue = (spec: EntryFieldSpec): string | string[] | null => {
    const ids = refs[spec.key] ?? []
    const ref = spec.ref!
    const fieldBlockId = fieldIds[spec.key] ?? null
    if (ref.kinds.length > 0 && options.kindOf) {
      for (const id of ids) {
        const found = options.kindOf(id)
        if (found && !ref.kinds.includes(found)) {
          issues.push({
            blockId: block.id,
            field: spec.key,
            fieldBlockId,
            message: `${spec.label} can only point at ${ref.kinds.join(" or ").replaceAll("_", " ")} Entries.`,
          })
        }
      }
    }
    if (ref.cardinality === "many") return ids
    if (ids.length > 1) {
      issues.push({ blockId: block.id, field: spec.key, fieldBlockId, message: `${spec.label} takes one Entry. Remove the others.` })
    }
    if (ids.length === 0 && !ref.optional) {
      issues.push({ blockId: block.id, field: spec.key, fieldBlockId, message: `${spec.label} needs an Entry. Type @ to pick one.` })
    }
    return ids[0] ?? null
  }

  const data: Record<string, unknown> = {}
  for (const spec of ENTRY_FIELDS[kind]) {
    if (spec.key === "name" || spec.key === "description") continue
    if (spec.ref) {
      data[spec.key] = refValue(spec)
    } else if (spec.list) {
      data[spec.key] = (values[spec.key] ?? "").split(/[,\n]/u).map((s) => s.trim()).filter(Boolean)
    } else {
      data[spec.key] = values[spec.key] ?? ""
    }
  }
  switch (kind) {
    case "location":
      data.isStart = props.isStart
      break
    case "character":
    case "npc":
      data.isPlayer = kind === "character" ? props.isPlayer : false
      data.hiddenFields = hiddenFields
      break
    case "clue":
      data.pointsToHidden = props.pointsToHidden
      data.redHerring = props.redHerring
      break
    case "exit_condition":
      data.arcIndex = props.arcIndex
      break
    case "knowledge":
      data.minBand = props.minBand
      data.characterId ??= ""
      break
    case "decisive_action":
      data.onSuccess = props.onSuccess
      data.requiresCount = (props.requiresCount as number) > 0 ? props.requiresCount : null
      data.wrongTargetPenalty = props.wrongTargetPenalty
      data.prematurePenalty = props.prematurePenalty
      data.correctTargetId ??= ""
      break
  }

  const candidate = { kind, name: values.name ?? "", description: values.description ?? "", keyFacts, data }
  let content: EntryContent | null = null
  if (issues.length === 0) {
    const parsed = entryContentSchema.safeParse(candidate)
    if (parsed.success) {
      content = parsed.data
    } else {
      for (const issue of parsed.error.issues) {
        const field = typeof issue.path[1] === "string" ? issue.path[1] : null
        issues.push({
          blockId: block.id,
          field,
          fieldBlockId: field ? (fieldIds[field] ?? null) : null,
          message: issue.message,
        })
      }
    }
  }

  const sourceTurn = props.sourceTurn as number
  return {
    blockId: block.id,
    entryId: props.entryId as string,
    kind,
    source: props.source as EntrySource,
    status: props.status as EntryStatus,
    sourceTurn: sourceTurn >= 0 ? sourceTurn : null,
    jevFlags: parseFlags(props.jevFlags as string),
    content,
    issues,
  }
}

/** Every Entry block in a document, in order, at any depth. */
export function entryBlocksOf(document: readonly SandsBlock[]): EntryBlock[] {
  const out: EntryBlock[] = []
  const visit = (blocks: readonly SandsBlock[]) => {
    for (const block of blocks) {
      if (isEntryBlockType(block.type)) out.push(block as EntryBlock)
      else visit(block.children)
    }
  }
  visit(document)
  return out
}

export function documentToEntries(
  document: readonly SandsBlock[],
  options: { kindOf?: (entryId: string) => EntryKind | undefined } = {}
): EntryBlockConversion[] {
  return entryBlocksOf(document).map((block) => blockToEntry(block, options))
}

/**
 * The Entry surface's document: Entries under "World" and "Story logic"
 * headings, with a subheading per kind that has Entries, in the given order.
 */
export function entriesToDocument(entries: readonly Entry[], options: { nameOf?: NameOf } = {}): SandsBlock[] {
  const byId = new Map(entries.map((entry) => [entry.id, entry]))
  const nameOf: NameOf = options.nameOf ?? ((id) => byId.get(id)?.name)
  const doc: SandsBlock[] = []
  for (const group of ["world", "story_logic"] as const) {
    const inGroup = entries.filter((entry) => ENTRY_GROUP_OF[entry.kind] === group)
    if (inGroup.length === 0) continue
    doc.push(groupBlock(group, ""))
    for (const kind of ENTRY_KINDS_BY_GROUP[group]) {
      const ofKind = inGroup.filter((entry) => entry.kind === kind)
      if (ofKind.length === 0) continue
      doc.push(groupBlock(group, kind))
      for (const entry of ofKind) doc.push(entryToBlock(entry, { nameOf }))
    }
  }
  return doc
}

function groupBlock(group: "world" | "story_logic", kind: EntryKind | ""): SandsBlock {
  return {
    id: `group:${group}${kind ? `:${kind}` : ""}`,
    type: "entryGroup",
    props: { group, kind },
    content: undefined,
    children: [],
  }
}
