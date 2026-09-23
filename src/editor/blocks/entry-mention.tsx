"use client"

/**
 * The Entry mention (`@Whitechapel`, `@C1`): an inline reference to an
 * existing Entry. It shows the Entry's current name and previews it on hover,
 * or when the editor selection covers the chip (Shift+Arrow onto it). A mention
 * whose Entry is rejected or gone renders as visibly broken.
 */
import * as React from "react"
import {
  createReactInlineContentSpec,
  useEditorSelectionChange,
} from "@blocknote/react"
import { Link2OffIcon } from "lucide-react"

import {
  ENTRY_KIND_ICONS,
  EntryKindBadge,
  EntryStatusBadge,
} from "@/components/codex/entry-badges"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { cn } from "@/lib/utils"

import { useSandsEditorContext } from "../editor-context"
import { paragraphsOf } from "../inline-text"
import { entryMentionConfig } from "../schema-config"

type MentionProps = {
  entryId: string
  label: string
  selection: () => { from: number; to: number; empty: boolean }
  getPos: () => number | undefined
}

function MentionChip({ entryId, label, selection, getPos }: MentionProps) {
  const ctx = useSandsEditorContext()
  const entry = ctx.entryIndex.get(entryId)
  const broken = !entry || entry.status === "rejected"
  const name = entry?.name || label || "Unknown Entry"
  const Icon = entry && !broken ? ENTRY_KIND_ICONS[entry.kind] : Link2OffIcon
  const [hovered, setHovered] = React.useState(false)
  const [selected, setSelected] = React.useState(false)

  useEditorSelectionChange(() => {
    const pos = getPos()
    const { from, to, empty } = selection()
    setSelected(pos !== undefined && !empty && from <= pos && to >= pos + 1)
  })

  const reason = !entry
    ? "This Entry no longer exists."
    : entry.status === "rejected"
      ? "This Entry was rejected."
      : null

  return (
    <HoverCard open={hovered || selected} onOpenChange={setHovered}>
      <HoverCardTrigger
        delay={250}
        render={
          <span
            className={cn("sands-mention", broken && "is-broken")}
            data-entry-id={entryId}
            aria-label={
              broken ? `Broken mention: ${name}. ${reason}` : `Mention: ${name}`
            }
          />
        }
      >
        <Icon aria-hidden />
        {name}
      </HoverCardTrigger>
      <HoverCardContent className="w-80" side="top">
        <div className="flex flex-col gap-2 text-sm">
          {entry ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <EntryKindBadge kind={entry.kind} />
              <EntryStatusBadge status={entry.status} />
            </div>
          ) : null}
          <p className="font-medium">{name}</p>
          {reason ? (
            <p className="text-destructive">
              {reason} Remove this mention or point it at another Entry.
            </p>
          ) : (
            paragraphsOf(entry?.description ?? "")
              .slice(0, 2)
              .map((paragraph) => (
                <p key={paragraph} className="text-muted-foreground">
                  {paragraph}
                </p>
              ))
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}

export const entryMentionSpec = createReactInlineContentSpec(
  entryMentionConfig,
  {
    render: (props) => (
      <MentionChip
        entryId={props.inlineContent.props.entryId}
        label={props.inlineContent.props.label}
        selection={() => props.editor.prosemirrorState.selection}
        getPos={() => {
          const pos = props.getPos()
          return typeof pos === "number" ? pos : undefined
        }}
      />
    ),
  }
)
