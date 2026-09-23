/**
 * The shared editor's BlockNote schema, with React rendering. Browser only;
 * the configs it renders live in `./schema-config.ts` (importable anywhere).
 */
import { BlockNoteSchema, defaultBlockSpecs, defaultInlineContentSpecs, defaultStyleSpecs } from "@blocknote/core"

import { entryMentionSpec } from "./blocks/entry-mention"
import { hiddenStyleSpec } from "./blocks/hidden-style"
import { briefHeadingSpecs, createGroupDivider, entryHeadingSpecs } from "./blocks/section-headings"

function create<R extends Record<string, () => unknown>>(record: R) {
  return Object.fromEntries(Object.entries(record).map(([type, make]) => [type, make()])) as { [K in keyof R]: ReturnType<R[K]> }
}

export const sandsSchema = BlockNoteSchema.create({
  blockSpecs: {
    paragraph: defaultBlockSpecs.paragraph,
    heading: defaultBlockSpecs.heading,
    bulletListItem: defaultBlockSpecs.bulletListItem,
    numberedListItem: defaultBlockSpecs.numberedListItem,
    quote: defaultBlockSpecs.quote,
    entryGroup: createGroupDivider(),
    ...create(briefHeadingSpecs),
    ...create(entryHeadingSpecs),
  },
  inlineContentSpecs: {
    text: defaultInlineContentSpecs.text,
    link: defaultInlineContentSpecs.link,
    entryMention: entryMentionSpec,
  },
  styleSpecs: { ...defaultStyleSpecs, hidden: hiddenStyleSpec },
})

export type SandsSchema = typeof sandsSchema
