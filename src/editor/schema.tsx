"use client"

/**
 * The Skeleton editor's BlockNote schema: paragraphs, headings, lists and
 * tables, plus the Hidden style. Browser only.
 */
import {
  BlockNoteSchema,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  defaultStyleSpecs,
} from "@blocknote/core"
import { createReactStyleSpec } from "@blocknote/react"

export const HIDDEN_TOOLTIP = "Hidden: the Writer never states this"

/** Hidden text: muted with a dashed underline (`.sands-hidden` in globals.css). */
const hiddenStyleSpec = createReactStyleSpec(
  { type: "hidden", propSchema: "boolean" },
  {
    render: (props) => (
      <span
        ref={props.contentRef}
        className="sands-hidden"
        data-hidden=""
        title={HIDDEN_TOOLTIP}
      />
    ),
  }
)

export const skeletonSchema = BlockNoteSchema.create({
  blockSpecs: {
    paragraph: defaultBlockSpecs.paragraph,
    heading: defaultBlockSpecs.heading,
    bulletListItem: defaultBlockSpecs.bulletListItem,
    numberedListItem: defaultBlockSpecs.numberedListItem,
    table: defaultBlockSpecs.table,
  },
  inlineContentSpecs: defaultInlineContentSpecs,
  styleSpecs: { ...defaultStyleSpecs, hidden: hiddenStyleSpec },
})

export type SkeletonEditorSchema = typeof skeletonSchema
