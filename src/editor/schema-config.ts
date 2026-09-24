/**
 * The shared editor's block, inline-content and style configs (type, props,
 * content), without rendering. Pure: safe to import on the server, in route
 * handlers and in tests. The React specs in `./blocks/` render these configs;
 * the conversions in `src/brief/` and `./entry-blocks.ts` read documents typed
 * by them.
 *
 * One schema, one plain-document design (docs/design/editor-design.md, spec §7.1-7.2):
 * - Section headings are the only custom blocks: six Brief kinds and nine
 *   Entry kinds. They have no children. Named kinds hold the name as their
 *   inline content.
 * - Fields are ordinary paragraphs after a heading that read `Label: value`.
 * - Hidden is a text style.
 * - Entry mentions are inline content; World / Story logic dividers are a
 *   non-editable block.
 */
import type {
  BlockConfig,
  BlockNoDefaults,
  CustomInlineContentConfig,
  PartialBlockNoDefaults,
  PropSchema,
  StyleConfig,
  _DefaultStyleSchema,
} from "@blocknote/core"
import type { defaultBlockSpecs } from "@blocknote/core"

import type { BriefBlockType } from "@/brief/fields"
import { ENTRY_KINDS, type EntryKind } from "@/domain/entry"

function blockConfig<
  const T extends string,
  const P extends PropSchema,
  const C extends "inline" | "none",
>(config: BlockConfig<T, P, C>) {
  return config
}

// Brief section headings. Named kinds (BRIEF_BLOCKS[type].named) hold the name as inline content.

export const briefBlockConfigs = {
  setting: blockConfig({ type: "setting", propSchema: {}, content: "none" }),
  character: blockConfig({
    type: "character",
    propSchema: { isPlayer: { default: false } },
    content: "inline",
  }),
  arc: blockConfig({ type: "arc", propSchema: {}, content: "inline" }),
  ending: blockConfig({ type: "ending", propSchema: {}, content: "none" }),
  location: blockConfig({
    type: "location",
    propSchema: {},
    content: "inline",
  }),
  voice: blockConfig({ type: "voice", propSchema: {}, content: "none" }),
} satisfies Record<BriefBlockType, BlockConfig>

// Entry section headings: one per Entry kind; the name is the inline content.

const SOURCES = ["author", "setup", "play"] as const
const STATUSES = [
  "locked",
  "proposed",
  "accepted",
  "edited",
  "rejected",
] as const

/** Props every Entry heading carries. Kind data lives in its `Label: value` fields. */
const entryProps = {
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

function entryBlockConfig<const T extends EntryBlockType>(type: T) {
  return blockConfig({ type, propSchema: entryProps, content: "inline" })
}

export const entryBlockConfigs = {
  locationEntry: entryBlockConfig("locationEntry"),
  characterEntry: entryBlockConfig("characterEntry"),
  npcEntry: entryBlockConfig("npcEntry"),
  factionEntry: entryBlockConfig("factionEntry"),
  clueEntry: entryBlockConfig("clueEntry"),
  objectEntry: entryBlockConfig("objectEntry"),
  exitConditionEntry: entryBlockConfig("exitConditionEntry"),
  knowledgeEntry: entryBlockConfig("knowledgeEntry"),
  decisiveActionEntry: entryBlockConfig("decisiveActionEntry"),
} satisfies Record<EntryBlockType, BlockConfig>

/** A non-editable divider: "World" or "Story logic". */
export const entryGroupConfig = blockConfig({
  type: "entryGroup",
  propSchema: {
    group: { default: "world", values: ["world", "story_logic"] as const },
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

/** Hidden: the Writer never states it; the Player must earn it through play. */
export const hiddenStyleConfig = {
  type: "hidden",
  propSchema: "boolean",
} as const satisfies StyleConfig

export const ENTRY_KIND_OF_BLOCK: Record<EntryBlockType, EntryKind> =
  Object.fromEntries(
    ENTRY_KINDS.map((kind) => [ENTRY_BLOCK_TYPE[kind], kind])
  ) as Record<EntryBlockType, EntryKind>

export function isEntryBlockType(type: string): type is EntryBlockType {
  return type in ENTRY_KIND_OF_BLOCK
}

/** Any section heading: a Brief kind or an Entry kind. */
export function isSectionHeadingType(type: string) {
  return type in briefBlockConfigs || isEntryBlockType(type)
}

/** The free-prose blocks kept from BlockNote's defaults. */
export const PROSE_BLOCK_TYPES = [
  "paragraph",
  "heading",
  "bulletListItem",
  "numberedListItem",
  "quote",
] as const
export type ProseBlockType = (typeof PROSE_BLOCK_TYPES)[number]

type DefaultSpecs = typeof defaultBlockSpecs

export type SandsBlockSchema = {
  [K in ProseBlockType]: DefaultSpecs[K]["config"]
} & typeof briefBlockConfigs &
  typeof entryBlockConfigs & { entryGroup: typeof entryGroupConfig }

export type SandsInlineContentSchema = {
  text: "text"
  link: "link"
  entryMention: typeof entryMentionConfig
}

export type SandsStyleSchema = _DefaultStyleSchema & {
  hidden: typeof hiddenStyleConfig
}

/** A block of the shared editor's document, as `editor.document` returns it. */
export type SandsBlock = BlockNoDefaults<
  SandsBlockSchema,
  SandsInlineContentSchema,
  SandsStyleSchema
>
/** A partial block, as accepted by `initialContent` and `editor.insertBlocks`. */
export type SandsPartialBlock = PartialBlockNoDefaults<
  SandsBlockSchema,
  SandsInlineContentSchema,
  SandsStyleSchema
>
/** A whole document. Stored as the World's `briefDoc`. */
export type SandsDocument = SandsBlock[]

export type ParagraphBlock = Extract<SandsBlock, { type: "paragraph" }>
export type EntryBlock = Extract<SandsBlock, { type: EntryBlockType }>
export type BriefSectionBlock = Extract<SandsBlock, { type: BriefBlockType }>
export type SandsInline = Exclude<ParagraphBlock["content"], undefined>[number]
