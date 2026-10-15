"use client"

/**
 * One Skeleton document in BlockNote (ADR-0001): a field section, or one row
 * of a section. BlockNote's own menus and toolbar, with an eye button that
 * marks the selection Hidden (also Mod-Shift-H).
 *
 * The document is read once, at mount: remount with a new `key` to show
 * another. Every edit reports the whole document.
 */
import "@blocknote/shadcn/style.css"

import * as React from "react"
import {
  FormattingToolbar,
  FormattingToolbarController,
  getFormattingToolbarItems,
  useBlockNoteEditor,
  useComponentsContext,
  useCreateBlockNote,
  useEditorState,
} from "@blocknote/react"
import { en } from "@blocknote/core/locales"
import { BlockNoteView } from "@blocknote/shadcn"
import { EyeOffIcon } from "lucide-react"
import { useTheme } from "next-themes"

import { shortcutKeys } from "@/lib/shortcuts"
import { cn } from "@/lib/utils"
import type { DocBlock } from "@/skeleton/document"

import { HIDDEN_TOOLTIP, skeletonSchema } from "./schema"
import { HIDDEN_SHORTCUT } from "./shortcuts"

type Editor = typeof skeletonSchema.BlockNoteEditor

export type DocumentEditorProps = {
  initialBlocks: readonly DocBlock[]
  onChange: (blocks: DocBlock[]) => void
  /** Accessible name of the editing area, e.g. "Character: Ruth Ashdown". */
  label: string
  /** Shown in an empty first heading: the row's name, e.g. "Character name". */
  namePlaceholder?: string
  /** Put the cursor at the start of the document once it loads. */
  autoFocus?: boolean
  className?: string
}

function HiddenButton() {
  const editor = useBlockNoteEditor() as unknown as Editor
  const Components = useComponentsContext()!
  const active = useEditorState({
    editor,
    selector: ({ editor }) =>
      !!(editor as unknown as Editor).getActiveStyles().hidden,
  })
  return (
    <Components.FormattingToolbar.Button
      className="bn-button"
      label="Hidden"
      mainTooltip={HIDDEN_TOOLTIP}
      secondaryTooltip={shortcutKeys(HIDDEN_SHORTCUT).join("+")}
      isSelected={active}
      onClick={() => {
        editor.focus()
        editor.toggleStyles({ hidden: true })
      }}
      icon={<EyeOffIcon />}
    />
  )
}

function SkeletonFormattingToolbar() {
  return (
    <FormattingToolbar>
      {getFormattingToolbarItems()}
      <HiddenButton key="hidden" />
    </FormattingToolbar>
  )
}

export function DocumentEditor({
  initialBlocks,
  onChange,
  label,
  namePlaceholder,
  autoFocus,
  className,
}: DocumentEditorProps) {
  const { resolvedTheme } = useTheme()
  const editor = useCreateBlockNote({
    schema: skeletonSchema,
    // Stored documents are BlockNote's own JSON, or partial blocks this app wrote.
    initialContent:
      initialBlocks.length > 0 ? (initialBlocks as never) : undefined,
    tables: { headers: true },
    dictionary: {
      ...en,
      placeholders: {
        ...en.placeholders,
        heading: namePlaceholder ?? en.placeholders.heading,
      },
    },
  })
  const onChangeRef = React.useRef(onChange)
  React.useEffect(() => {
    onChangeRef.current = onChange
  })

  React.useEffect(() => {
    if (!autoFocus) return
    const first = editor.document[0]
    if (first) editor.setTextCursorPosition(first, "start")
    editor.focus()
  }, [autoFocus, editor])

  return (
    <div
      className={cn("sands-editor", className)}
      onKeyDownCapture={(event) => {
        const mod = event.metaKey || event.ctrlKey
        if (mod && event.shiftKey && event.key.toLowerCase() === "h") {
          event.preventDefault()
          editor.toggleStyles({ hidden: true })
        }
      }}
    >
      <BlockNoteView
        editor={editor}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
        formattingToolbar={false}
        aria-label={label}
        onChange={() =>
          onChangeRef.current(editor.document as unknown as DocBlock[])
        }
      >
        <FormattingToolbarController
          formattingToolbar={SkeletonFormattingToolbar}
        />
      </BlockNoteView>
    </div>
  )
}
