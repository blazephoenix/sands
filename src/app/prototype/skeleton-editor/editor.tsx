"use client"

/** PROTOTYPE, throwaway (issue #36): a plain BlockNote editor with the Hidden style. */
import "@blocknote/shadcn/style.css"

import {
  BlockNoteSchema,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  defaultStyleSpecs,
} from "@blocknote/core"
import { createReactStyleSpec, useCreateBlockNote } from "@blocknote/react"
import { BlockNoteView } from "@blocknote/shadcn"
import { useTheme } from "next-themes"

import type { ProtoBlock } from "./to-blocks"

const hiddenStyle = createReactStyleSpec(
  { type: "hidden", propSchema: "boolean" },
  {
    render: (props) => (
      <span
        ref={props.contentRef}
        className="sands-hidden"
        title="Hidden: the Writer never states this"
      />
    ),
  }
)

const schema = BlockNoteSchema.create({
  blockSpecs: {
    paragraph: defaultBlockSpecs.paragraph,
    heading: defaultBlockSpecs.heading,
    table: defaultBlockSpecs.table,
    bulletListItem: defaultBlockSpecs.bulletListItem,
  },
  inlineContentSpecs: defaultInlineContentSpecs,
  styleSpecs: { ...defaultStyleSpecs, hidden: hiddenStyle },
})

export default function ProtoEditor({ blocks }: { blocks: ProtoBlock[] }) {
  const { resolvedTheme } = useTheme()
  const editor = useCreateBlockNote({
    schema,
    // The prototype's blocks are shaped for this schema; the type is BlockNote's to check at runtime.
    initialContent: blocks as never,
  })
  return (
    <BlockNoteView
      editor={editor}
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      className="sands-editor"
    />
  )
}
