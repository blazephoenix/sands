/**
 * A headless editor over the shared schema's configs, with no rendering. Lets
 * tests (and any server code that must normalise a document) run a document
 * through BlockNote's real schema and read back `editor.document`, exactly as
 * the browser editor would store it.
 */
import {
  type BlockConfig,
  type PropSchema,
  BlockNoteEditor,
  BlockNoteSchema,
  createBlockSpec,
  createInlineContentSpec,
  createStyleSpec,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  defaultStyleSpecs,
} from "@blocknote/core"

import {
  briefBlockConfigs,
  entryBlockConfigs,
  entryGroupConfig,
  entryMentionConfig,
  hiddenStyleConfig,
  type SandsBlock,
  type SandsPartialBlock,
} from "./schema-config"

const noRender = () => ({ dom: {} as HTMLElement })

function spec<const T extends string, const P extends PropSchema, const C extends "inline" | "none">(
  config: BlockConfig<T, P, C>
) {
  return createBlockSpec(config, { render: noRender })()
}

export function createHeadlessSchema() {
  return BlockNoteSchema.create({
    blockSpecs: {
      paragraph: defaultBlockSpecs.paragraph,
      heading: defaultBlockSpecs.heading,
      bulletListItem: defaultBlockSpecs.bulletListItem,
      numberedListItem: defaultBlockSpecs.numberedListItem,
      quote: defaultBlockSpecs.quote,
      entryGroup: spec(entryGroupConfig),
      ...Object.fromEntries(
        Object.entries({ ...briefBlockConfigs, ...entryBlockConfigs }).map(([type, config]) => [type, spec(config)])
      ),
    },
    inlineContentSpecs: {
      ...defaultInlineContentSpecs,
      entryMention: createInlineContentSpec(entryMentionConfig, { render: noRender }),
    },
    styleSpecs: {
      ...defaultStyleSpecs,
      hidden: createStyleSpec(hiddenStyleConfig, { render: () => ({ dom: {} as HTMLElement }) }),
    },
  })
}

/** Loads `blocks` into a headless editor and returns BlockNote's normalised document. */
export function normaliseDocument(blocks: readonly (SandsBlock | SandsPartialBlock)[]): SandsBlock[] {
  const editor = BlockNoteEditor.create({
    schema: createHeadlessSchema(),
    initialContent: blocks.length > 0 ? (blocks as never) : undefined,
    trailingBlock: false,
  })
  return editor.document as unknown as SandsBlock[]
}
