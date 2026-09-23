/**
 * The shared editor's block and inline-content configs (type, props, content),
 * without rendering. Pure: safe to import on the server, in route handlers and
 * in tests. The React specs in `./blocks/` render these configs, and the
 * conversions in `src/brief/` and `./entry-blocks.ts` read documents typed by
 * them.
 *
 * One schema serves the three surfaces (ADR-0008):
 * - Brief: typed blocks (setting, character, arc, ending, location, voice) with
 *   child `field` blocks, plus free prose (paragraph, heading, lists, quote).
 * - Entry: one block per Entry kind (`locationEntry`, ...) with child `field`
 *   blocks, grouped under non-editable `entryGroup` headings.
 * - Entry mention: the `entryMention` inline content.
 */
import type {
  BlockConfig,
  BlockNoDefaults,
  CustomInlineContentConfig,
  PartialBlockNoDefaults,
  PropSchema,
  _DefaultStyleSchema,
} from "@blocknote/core"
import type { defaultBlockSpecs } from "@blocknote/core"

import type { BriefBlockType } from "@/brief/fields"
import { ENTRY_KINDS, type EntryKind } from "@/domain/entry"

function blockConfig<const T extends string, const P extends PropSchema, const C extends "inline" | "none">(
  config: BlockConfig<T, P, C>
) {
  return config
}

// Field: one labelled, multi-paragraph value inside a typed block or an Entry block.

export const fieldConfig = blockConfig({
  type: "field",
  propSchema: {
    /** Typed field key (e.g. "personality"), or "custom" for an Author-labelled field. */
    key: { default: "custom" },
    /** The label shown; editable for custom fields. */
    label: { default: "" },
    /** Hidden: the Writer never states it; the Player must earn it. */
    hidden: { default: false },
  },
  content: "inline",
})

// Brief surface: typed blocks. Their fields are child `field` blocks.

export const briefBlockConfigs = {
  setting: blockConfig({ type: "setting", propSchema: {}, content: "none" }),
  character: blockConfig({
    type: "character",
    propSchema: { isPlayer: { default: false } },
    content: "none",
  }),
  arc: blockConfig({ type: "arc", propSchema: {}, content: "none" }),
  ending: blockConfig({ type: "ending", propSchema: {}, content: "none" }),
  location: blockConfig({ type: "location", propSchema: {}, content: "none" }),
  voice: blockConfig({ type: "voice", propSchema: {}, content: "none" }),
} satisfies Record<BriefBlockType, BlockConfig>

// Entry surface: one block per Entry kind.

const SOURCES = ["author", "setup", "play"] as const
const STATUSES = ["locked", "proposed", "accepted", "edited", "rejected"] as const

/** Props every Entry block carries. Scalar kind data is added per kind. */
const entryBaseProps = {
  /** The Entry id; empty for an Entry the Author just added and the server has not stored. */
  entryId: { default: "" },
  source: { default: "author", values: SOURCES },
  status: { default: "accepted", values: STATUSES },
  /** Turn index for play Entries; -1 otherwise. */
  sourceTurn: { default: -1 },
  /** JSON array of `JevFlag`. */
  jevFlags: { default: "[]" },
} as const

export const ENTRY_BLOCK_TYPE = {
  location: "locationEntry",
  character: "characterEntry",
  npc: "npcEntry",
  faction: "factionEntry",
  clue: "clueEntry",
  object: "objectEntry",
  exit_condition: "exitConditionEntry",
  knowledge: "knowledgeEntry",
  decisive_action: "decisiveActionEntry",
} as const satisfies Record<EntryKind, string>
export type EntryBlockType = (typeof ENTRY_BLOCK_TYPE)[EntryKind]

export const entryBlockConfigs = {
  locationEntry: blockConfig({
    type: "locationEntry",
    propSchema: { ...entryBaseProps, isStart: { default: false } },
    content: "none",
  }),
  characterEntry: blockConfig({
    type: "characterEntry",
    propSchema: { ...entryBaseProps, isPlayer: { default: false } },
    content: "none",
  }),
  npcEntry: blockConfig({ type: "npcEntry", propSchema: { ...entryBaseProps }, content: "none" }),
  factionEntry: blockConfig({ type: "factionEntry", propSchema: { ...entryBaseProps }, content: "none" }),
  clueEntry: blockConfig({
    type: "clueEntry",
    propSchema: {
      ...entryBaseProps,
      pointsToHidden: { default: false },
      redHerring: { default: false },
    },
    content: "none",
  }),
  objectEntry: blockConfig({ type: "objectEntry", propSchema: { ...entryBaseProps }, content: "none" }),
  exitConditionEntry: blockConfig({
    type: "exitConditionEntry",
    propSchema: { ...entryBaseProps, arcIndex: { default: 0 } },
    content: "none",
  }),
  knowledgeEntry: blockConfig({
    type: "knowledgeEntry",
    propSchema: { ...entryBaseProps, minBand: { default: "normal", values: ["low", "normal", "high"] as const } },
    content: "none",
  }),
  decisiveActionEntry: blockConfig({
    type: "decisiveActionEntry",
    propSchema: {
      ...entryBaseProps,
      onSuccess: { default: "win", values: ["win", "none"] as const },
      /** 0 means every required Clue is needed. */
      requiresCount: { default: 0 },
      wrongTargetPenalty: { default: 15 },
      prematurePenalty: { default: 20 },
    },
    content: "none",
  }),
} satisfies Record<EntryBlockType, BlockConfig>

/** A non-editable heading that groups Entry blocks: "World" or "Story logic", optionally per kind. */
export const entryGroupConfig = blockConfig({
  type: "entryGroup",
  propSchema: {
    group: { default: "world", values: ["world", "story_logic"] as const },
    /** Empty for the group heading itself; an Entry kind for a per-kind subheading. */
    kind: { default: "" },
  },
  content: "none",
})

export const entryMentionConfig = {
  type: "entryMention",
  propSchema: {
    entryId: { default: "" },
    /** The Entry's name when the mention was made, shown if the Entry is gone. */
    label: { default: "" },
  },
  content: "none",
} as const satisfies CustomInlineContentConfig

export const ENTRY_KIND_OF_BLOCK: Record<EntryBlockType, EntryKind> = Object.fromEntries(
  ENTRY_KINDS.map((kind) => [ENTRY_BLOCK_TYPE[kind], kind])
) as Record<EntryBlockType, EntryKind>

export function isEntryBlockType(type: string): type is EntryBlockType {
  return type in ENTRY_KIND_OF_BLOCK
}

/** The free-prose blocks the Brief keeps from BlockNote's defaults. */
export const PROSE_BLOCK_TYPES = [
  "paragraph",
  "heading",
  "bulletListItem",
  "numberedListItem",
  "quote",
] as const
export type ProseBlockType = (typeof PROSE_BLOCK_TYPES)[number]

type DefaultSpecs = typeof defaultBlockSpecs

export type SandsBlockSchema = { [K in ProseBlockType]: DefaultSpecs[K]["config"] } & typeof briefBlockConfigs &
  typeof entryBlockConfigs & {
    field: typeof fieldConfig
    entryGroup: typeof entryGroupConfig
  }

export type SandsInlineContentSchema = {
  text: "text"
  link: "link"
  entryMention: typeof entryMentionConfig
}

export type SandsStyleSchema = _DefaultStyleSchema

/** A block of the shared editor's document, as `editor.document` returns it. */
export type SandsBlock = BlockNoDefaults<SandsBlockSchema, SandsInlineContentSchema, SandsStyleSchema>
/** A partial block, as accepted by `initialContent` and `editor.insertBlocks`. */
export type SandsPartialBlock = PartialBlockNoDefaults<SandsBlockSchema, SandsInlineContentSchema, SandsStyleSchema>
/** A whole document. Stored as the World's `briefDoc`. */
export type SandsDocument = SandsBlock[]

export type FieldBlock = Extract<SandsBlock, { type: "field" }>
export type EntryBlock = Extract<SandsBlock, { type: EntryBlockType }>
export type BriefTypedBlock = Extract<SandsBlock, { type: BriefBlockType }>
export type SandsInline = Exclude<FieldBlock["content"], undefined>[number]
