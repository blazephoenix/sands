"use client"

/**
 * The one BlockNote editor behind every editing surface (ADR-0008), on the
 * shadcn UI package, as a plain document (docs/design/editor-design.md). `BriefEditor` and
 * `EntryEditor` wrap it per surface; use those rather than this directly.
 */
import "@blocknote/shadcn/style.css"

import * as React from "react"
import { BlockNoteView } from "@blocknote/shadcn"
import {
  FormattingToolbarController,
  SideMenuController,
  SuggestionMenuController,
  useCreateBlockNote,
} from "@blocknote/react"
import { useTheme } from "next-themes"

import { BRIEF_BLOCKS, BRIEF_BLOCK_TYPES } from "@/brief/fields"
import { ENTRY_KINDS } from "@/domain/entry"
import { cn } from "@/lib/utils"

import type { SandsEditor } from "./commands"
import {
  SandsEditorContext,
  type BlockAnnotation,
  type SandsEditorContextValue,
} from "./editor-context"
import { ENTRY_NAME_PLACEHOLDER } from "./entry-fields"
import {
  installLockGuard,
  refreshSections,
  sectionsExtension,
} from "./extensions"
import {
  BlockMenu,
  SandsFormattingToolbar,
  getMentionItems,
  getSlashItems,
  makeSideMenu,
} from "./menus"
import { sandsSchema } from "./schema"
import { ENTRY_BLOCK_TYPE, type SandsBlock } from "./schema-config"

export type SandsEditorViewProps = {
  surface: SandsEditorContextValue["surface"]
  /** Read once, at mount. Remount with a new `key` to load a different document. */
  initialContent: readonly SandsBlock[]
  context?: Partial<Omit<SandsEditorContextValue, "surface" | "readOnly">>
  readOnly?: boolean
  onChange?: (document: SandsBlock[], editor: SandsEditor) => void
  onReady?: (editor: SandsEditor) => void
  className?: string
  /** Accessible name of the editing area, e.g. "Brief". */
  label: string
}

/** Carries live values into the editor's extensions, which are created once. */
class ExtensionBridge {
  annotations: ReadonlyMap<string, BlockAnnotation[]> = new Map()
  openBlockMenu: () => void = () => {}
  setAnnotations(next: ReadonlyMap<string, BlockAnnotation[]>) {
    this.annotations = next
  }
  setOpenBlockMenu(open: () => void) {
    this.openBlockMenu = open
  }
}

const PLACEHOLDERS: Record<string, string | undefined> = {
  ...Object.fromEntries(
    BRIEF_BLOCK_TYPES.filter((type) => BRIEF_BLOCKS[type].named).map((type) => [
      type,
      BRIEF_BLOCKS[type].namePlaceholder,
    ])
  ),
  ...Object.fromEntries(
    ENTRY_KINDS.map((kind) => [
      ENTRY_BLOCK_TYPE[kind],
      ENTRY_NAME_PLACEHOLDER[kind],
    ])
  ),
}

function inParagraph(tr: {
  selection: { $from: { parent: { type: { name: string } } } }
}) {
  return tr.selection.$from.parent.type.name === "paragraph"
}

export function SandsEditorView({
  surface,
  initialContent,
  context,
  readOnly = false,
  onChange,
  onReady,
  className,
  label,
}: SandsEditorViewProps) {
  const { resolvedTheme } = useTheme()
  const [bridge] = React.useState(() => new ExtensionBridge())
  const [blockMenuOpen, setBlockMenuOpen] = React.useState(false)

  const editor = useCreateBlockNote(
    {
      schema: sandsSchema,
      initialContent:
        initialContent.length > 0 ? (initialContent as never) : undefined,
      trailingBlock: surface === "brief",
      placeholders: {
        ...PLACEHOLDERS,
        default:
          surface === "brief"
            ? "Write free prose, or type / for a Setting, Character, Arc…"
            : "Type / to add an Entry",
        emptyDocument:
          surface === "brief"
            ? "Type / to add a Setting, Character, Arc or Ending"
            : "Type / to add an Entry",
      },
      extensions: [
        sectionsExtension({
          annotations: () => bridge.annotations,
          openBlockMenu: () => bridge.openBlockMenu(),
        }),
      ],
      domAttributes: { editor: { "aria-label": label } },
    },
    []
  ) as unknown as SandsEditor

  React.useEffect(() => installLockGuard(editor), [editor])
  React.useEffect(() => {
    bridge.setOpenBlockMenu(() => setBlockMenuOpen(true))
  }, [bridge])
  React.useEffect(() => {
    onReady?.(editor)
    // Once per editor instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor])

  const annotations = context?.annotations
  React.useEffect(() => {
    bridge.setAnnotations(annotations ?? new Map())
    refreshSections(editor)
  }, [annotations, bridge, editor])

  const sideMenu = React.useMemo(() => makeSideMenu(surface), [surface])
  const index = context?.entryIndex

  const value = React.useMemo<SandsEditorContextValue>(
    () => ({
      surface,
      readOnly,
      entryIndex: context?.entryIndex ?? new Map(),
      entryActions: context?.entryActions,
      entryLabelNote: context?.entryLabelNote,
      annotations: context?.annotations ?? new Map(),
      kindCounts: context?.kindCounts ?? {},
    }),
    [
      surface,
      readOnly,
      context?.entryIndex,
      context?.entryActions,
      context?.entryLabelNote,
      context?.annotations,
      context?.kindCounts,
    ]
  )

  return (
    <SandsEditorContext.Provider value={value}>
      <BlockNoteView
        editor={editor}
        editable={!readOnly}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
        slashMenu={false}
        sideMenu={false}
        formattingToolbar={false}
        // ":" starts every field label; BlockNote's emoji picker would open on each one.
        emojiPicker={false}
        className={cn("sands-editor", className)}
        data-surface={surface}
        onChange={() => onChange?.(editor.document as SandsBlock[], editor)}
      >
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={(query) => getSlashItems(editor, surface, query)}
        />
        {surface === "entry" ? (
          <SuggestionMenuController
            triggerCharacter="@"
            shouldOpen={(tr) => inParagraph(tr)}
            getItems={(query) =>
              getMentionItems(editor, index ?? new Map(), query)
            }
          />
        ) : null}
        <SideMenuController sideMenu={sideMenu} />
        <FormattingToolbarController
          formattingToolbar={SandsFormattingToolbar}
        />
      </BlockNoteView>
      <BlockMenu
        editor={editor}
        open={blockMenuOpen}
        onOpenChange={setBlockMenuOpen}
      />
    </SandsEditorContext.Provider>
  )
}
