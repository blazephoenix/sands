"use client"

/**
 * The shared editor's menus. Every control lives here, in BlockNote's own menus
 * (editor-design.md), never inside a block:
 * - the slash menu: a Brief group of section kinds, then BlockNote's defaults;
 *   Entry kinds only on the Entry surface;
 * - the `@` mention menu: live (non-rejected) Entries only;
 * - the ⠿ menu: Player character, Accept / Reject / Restore (from the page),
 *   Delete; the same actions open from the keyboard with `Mod-/`;
 * - the formatting toolbar, with the Hidden eye button.
 */
import * as React from "react"
import type {
  DefaultReactSuggestionItem,
  SideMenuProps,
} from "@blocknote/react"
import {
  AddBlockButton,
  DragHandleButton,
  DragHandleMenu,
  FormattingToolbar,
  SideMenu,
  getDefaultReactSlashMenuItems,
  getFormattingToolbarItems,
  useBlockNoteEditor,
  useComponentsContext,
  useEditorState,
  useExtensionState,
} from "@blocknote/react"
import {
  SideMenuExtension,
  filterSuggestionItems,
} from "@blocknote/core/extensions"
import { EyeOffIcon } from "lucide-react"

import {
  BRIEF_BLOCK_ICONS,
  ENTRY_KIND_ICONS,
} from "@/components/codex/entry-badges"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { BRIEF_BLOCK_TYPES, BRIEF_BLOCKS } from "@/brief/fields"
import {
  ENTRY_GROUP_LABELS,
  ENTRY_GROUP_OF,
  ENTRY_KINDS,
  ENTRY_KIND_LABELS,
  isLiveEntry,
} from "@/domain/entry"

import { HIDDEN_TOOLTIP } from "./blocks/hidden-style"
import { entryBlockInfo } from "./blocks/section-headings"
import {
  deleteSection,
  insertBriefSection,
  insertEntrySection,
  isLockedEntryHeading,
  moveUnit,
  sectionOf,
  selectSection,
  type SandsEditor,
} from "./commands"
import {
  useSandsEditorContext,
  type BlockAction,
  type EntryIndex,
  type EditorSurface,
  type SandsEditorContextValue,
} from "./editor-context"
import { ENTRY_KIND_DESCRIPTIONS } from "./entry-fields"
import {
  isEntryBlockType,
  isSectionHeadingType,
  type EntryBlock,
  type SandsBlock,
} from "./schema-config"
import { EDITOR_SHORTCUTS, shortcutKeys } from "./shortcuts"

// Slash menu

/** Slash menu items: section kinds first (icon and one line in CONTEXT.md vocabulary), then BlockNote's defaults. */
export function slashMenuItems(
  editor: SandsEditor,
  surface: EditorSurface
): DefaultReactSuggestionItem[] {
  if (surface === "entry") {
    return ENTRY_KINDS.map((kind) => {
      const Icon = ENTRY_KIND_ICONS[kind]
      return {
        title: ENTRY_KIND_LABELS[kind].singular,
        subtext: ENTRY_KIND_DESCRIPTIONS[kind],
        aliases: [
          kind,
          kind.replaceAll("_", " "),
          ENTRY_KIND_LABELS[kind].plural.toLowerCase(),
        ],
        group: ENTRY_GROUP_LABELS[ENTRY_GROUP_OF[kind]],
        icon: <Icon />,
        onItemClick: () => {
          insertEntrySection(editor, kind)
        },
      }
    })
  }
  const brief = BRIEF_BLOCK_TYPES.map((type): DefaultReactSuggestionItem => {
    const spec = BRIEF_BLOCKS[type]
    const Icon = BRIEF_BLOCK_ICONS[type]
    return {
      title: spec.title,
      subtext: spec.description,
      aliases: spec.aliases,
      group: "Brief",
      icon: <Icon />,
      onItemClick: () => {
        insertBriefSection(editor, type)
      },
    }
  })
  return [...brief, ...getDefaultReactSlashMenuItems(editor)]
}

export async function getSlashItems(
  editor: SandsEditor,
  surface: EditorSurface,
  query: string
) {
  return filterSuggestionItems(slashMenuItems(editor, surface), query)
}

// Mention menu

/** Mention menu items: only live (non-rejected) Entries, never the Entry being edited. */
export async function getMentionItems(
  editor: SandsEditor,
  index: EntryIndex,
  query: string
): Promise<DefaultReactSuggestionItem[]> {
  const { block } = editor.getTextCursorPosition()
  const heading = sectionOf(editor, block.id)?.heading
  const ownId =
    heading && isEntryBlockType(heading.type)
      ? (heading.props as { entryId: string }).entryId
      : ""

  const items = [...index.values()]
    .filter(
      (entry) =>
        isLiveEntry(entry) && entry.id !== ownId && entry.name.trim() !== ""
    )
    .sort(
      (a, b) =>
        ENTRY_KINDS.indexOf(a.kind) - ENTRY_KINDS.indexOf(b.kind) ||
        a.name.localeCompare(b.name)
    )
    .map((entry): DefaultReactSuggestionItem => {
      const Icon = ENTRY_KIND_ICONS[entry.kind]
      return {
        title: entry.name,
        subtext: entry.description.split("\n")[0]?.slice(0, 80) || undefined,
        badge: ENTRY_KIND_LABELS[entry.kind].singular,
        aliases: [ENTRY_KIND_LABELS[entry.kind].singular, entry.kind],
        group: ENTRY_KIND_LABELS[entry.kind].plural,
        icon: <Icon />,
        onItemClick: () => {
          editor.insertInlineContent([
            {
              type: "entryMention",
              props: { entryId: entry.id, label: entry.name },
            },
            " ",
          ])
        },
      }
    })
  return filterSuggestionItems(items, query)
}

// Block actions, shared by the ⠿ menu and the keyboard block menu.

/** The actions for one block. */
export function blockActions(
  editor: SandsEditor,
  block: SandsBlock,
  ctx: SandsEditorContextValue
): BlockAction[] {
  if (ctx.readOnly || block.type === "entryGroup") return []
  const actions: BlockAction[] = []
  const section = sectionOf(editor, block.id)
  const lockedSection =
    section?.heading && isLockedEntryHeading(section.heading)
  const move = (direction: -1 | 1): BlockAction => ({
    id: direction === -1 ? "move-up" : "move-down",
    label: isSectionHeadingType(block.type)
      ? `Move section ${direction === -1 ? "up" : "down"}`
      : `Move ${direction === -1 ? "up" : "down"}`,
    shortcut:
      direction === -1 ? EDITOR_SHORTCUTS.moveUp : EDITOR_SHORTCUTS.moveDown,
    run: () => {
      moveUnit(editor, block.id, direction)
    },
  })

  if (block.type === "character") {
    actions.push({
      id: "player-character",
      label: "Player character",
      checked: block.props.isPlayer,
      run: () =>
        editor.updateBlock(block, {
          props: { isPlayer: !block.props.isPlayer },
        }),
    })
  }
  if (isEntryBlockType(block.type)) {
    const info = entryBlockInfo(block as EntryBlock)
    actions.push(...(ctx.entryActions?.(info) ?? []))
    actions.push(move(-1), move(1))
    if (!info.entryId) {
      actions.push({
        id: "delete-section",
        label: "Delete Entry",
        destructive: true,
        run: () => deleteSection(editor, block.id),
      })
    }
    return actions
  }
  if (isSectionHeadingType(block.type)) {
    actions.push(move(-1), move(1), {
      id: "delete-section",
      label: "Delete section",
      destructive: true,
      run: () => deleteSection(editor, block.id),
    })
    return actions
  }
  if (lockedSection) return actions
  if (!section) actions.push(move(-1), move(1))
  actions.push({
    id: "delete",
    label: "Delete",
    destructive: true,
    run: () => editor.removeBlocks([block]),
  })
  return actions
}

function useSideMenuBlock() {
  const editor = useBlockNoteEditor()
  return useExtensionState(SideMenuExtension, {
    editor,
    selector: (state) => state?.block,
  }) as SandsBlock | undefined
}

/** The ⠿ menu's items: the block's actions. */
function SandsDragHandleMenu() {
  const editor = useBlockNoteEditor() as unknown as SandsEditor
  const Components = useComponentsContext()!
  const ctx = useSandsEditorContext()
  const block = useSideMenuBlock()
  if (!block) return null
  const actions = blockActions(editor, block, ctx).filter(
    (action) => !action.disabled
  )
  return (
    <DragHandleMenu>
      {actions.map((action) => (
        <Components.Generic.Menu.Item
          key={action.id}
          className="bn-menu-item"
          checked={action.checked}
          onClick={action.run}
        >
          {action.label}
        </Components.Generic.Menu.Item>
      ))}
    </DragHandleMenu>
  )
}

/** The side menu: "+" and ⠿. Dragging a section heading drags its whole section. */
export function makeSideMenu(surface: EditorSurface) {
  return function SandsSideMenu(props: SideMenuProps) {
    const editor = useBlockNoteEditor() as unknown as SandsEditor
    const block = useSideMenuBlock()
    if (!block || block.type === "entryGroup")
      return <SideMenu {...props}>{null}</SideMenu>
    return (
      <SideMenu {...props} dragHandleMenu={SandsDragHandleMenu}>
        {surface === "brief" ? <AddBlockButton /> : null}
        <span
          className="contents"
          onDragStartCapture={() => {
            if (isSectionHeadingType(block.type))
              selectSection(editor, block.id)
          }}
        >
          <DragHandleButton {...props} dragHandleMenu={SandsDragHandleMenu} />
        </span>
      </SideMenu>
    )
  }
}

// Formatting toolbar

function HiddenButton() {
  const editor = useBlockNoteEditor() as unknown as SandsEditor
  const Components = useComponentsContext()!
  const active = useEditorState({
    editor,
    selector: ({ editor }) =>
      !!(editor as unknown as SandsEditor).getActiveStyles().hidden,
  })
  return (
    <Components.FormattingToolbar.Button
      className="bn-button"
      label="Hidden"
      mainTooltip={HIDDEN_TOOLTIP}
      secondaryTooltip={shortcutKeys(EDITOR_SHORTCUTS.toggleHidden).join("+")}
      isSelected={active}
      onClick={() => {
        editor.focus()
        editor.toggleStyles({ hidden: true })
      }}
      icon={<EyeOffIcon />}
    />
  )
}

/** BlockNote's formatting toolbar plus the Hidden eye button. */
export function SandsFormattingToolbar() {
  return (
    <FormattingToolbar>
      {getFormattingToolbarItems()}
      <HiddenButton key="hidden" />
    </FormattingToolbar>
  )
}

// Keyboard block menu (Mod-/)

/**
 * The block's actions as a menu anchored at the block holding the cursor, for
 * keyboard users (BlockNote's ⠿ menu opens by mouse only). Focus returns to
 * the editor when it closes.
 */
export function BlockMenu({
  editor,
  open,
  onOpenChange,
}: {
  editor: SandsEditor
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const ctx = useSandsEditorContext()
  const [state, setState] = React.useState<{
    rect: DOMRect
    actions: BlockAction[]
    title: string
  } | null>(null)

  React.useEffect(() => {
    if (!open) return
    const { block } = editor.getTextCursorPosition()
    const element = editor.domElement?.querySelector(
      `.bn-block[data-id="${CSS.escape(block.id)}"]`
    )
    const actions = blockActions(editor, block as SandsBlock, ctx)
    const title = isSectionHeadingType(block.type)
      ? "Section actions"
      : "Block actions"
    // Opening is driven by the keyboard shortcut, outside React's render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(
      element ? { rect: element.getBoundingClientRect(), actions, title } : null
    )
  }, [open, editor, ctx])

  const close = (next: boolean) => {
    onOpenChange(next)
    if (!next) window.setTimeout(() => editor.focus(), 0)
  }

  if (!open || !state) return null
  return (
    <DropdownMenu open={open} onOpenChange={close}>
      <DropdownMenuTrigger
        nativeButton={false}
        render={
          <span
            aria-hidden
            className="pointer-events-none fixed size-0"
            style={{ left: state.rect.left, top: state.rect.top }}
          />
        }
      />
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{state.title}</DropdownMenuLabel>
          {state.actions.length === 0 ? (
            <DropdownMenuItem disabled>
              No actions for this block
            </DropdownMenuItem>
          ) : null}
          {state.actions.map((action) =>
            action.checked === undefined ? (
              <DropdownMenuItem
                key={action.id}
                disabled={action.disabled}
                variant={action.destructive ? "destructive" : "default"}
                onClick={() => {
                  action.run()
                  close(false)
                }}
              >
                {action.label}
                {action.shortcut ? (
                  <DropdownMenuShortcut>
                    {shortcutKeys(action.shortcut).join("")}
                  </DropdownMenuShortcut>
                ) : null}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuCheckboxItem
                key={action.id}
                checked={action.checked}
                disabled={action.disabled}
                onCheckedChange={() => {
                  action.run()
                  close(false)
                }}
              >
                {action.label}
              </DropdownMenuCheckboxItem>
            )
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
