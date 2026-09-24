"use client"

/**
 * Section headings: the only custom blocks (docs/design/editor-design.md). Each renders a
 * small muted, non-editable label line (icon, kind, status bits), then, for
 * named kinds, the name as editable text in a large line. No controls, no
 * children.
 */
import { createReactBlockSpec } from "@blocknote/react"
import { FlagIcon, LockIcon } from "lucide-react"

import {
  BRIEF_BLOCK_ICONS,
  ENTRY_KIND_ICONS,
  entryStatusLabel,
  formatProbability,
  sourceLabel,
} from "@/components/codex/entry-badges"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { BRIEF_BLOCKS, type BriefBlockType } from "@/brief/fields"
import {
  ENTRY_GROUP_LABELS,
  ENTRY_KIND_LABELS,
  ENTRY_KINDS_BY_GROUP,
  jevFlagSchema,
  type EntryGroup,
  type EntrySource,
  type EntryStatus,
} from "@/domain/entry"
import { z } from "zod"

import { useSandsEditorContext, type EntryBlockInfo } from "../editor-context"
import { inlineToText } from "../inline-text"
import {
  ENTRY_KIND_OF_BLOCK,
  briefBlockConfigs,
  entryBlockConfigs,
  entryGroupConfig,
  type EntryBlock,
  type EntryBlockType,
  type SandsBlock,
  type SandsInline,
} from "../schema-config"

function Notes({ blockId }: { blockId: string }) {
  const ctx = useSandsEditorContext()
  const notes = ctx.annotations.get(blockId) ?? []
  if (notes.length === 0) return null
  return (
    <span
      className="sands-field-note"
      data-severity={
        notes.some((n) => n.severity === "error") ? "error" : "warning"
      }
      contentEditable={false}
    >
      {notes.map((n) => n.message).join(" ")}
    </span>
  )
}

type HeadingProps = {
  block: SandsBlock
  contentRef?: (node: HTMLElement | null) => void
}

function BriefHeading({ block, contentRef }: HeadingProps) {
  const ctx = useSandsEditorContext()
  const type = block.type as BriefBlockType
  const spec = BRIEF_BLOCKS[type]
  const Icon = BRIEF_BLOCK_ICONS[type]
  const isPlayer = block.type === "character" && block.props.isPlayer
  const invalid = (ctx.annotations.get(block.id) ?? []).some(
    (n) => n.severity === "error"
  )
  return (
    <div
      className="sands-heading"
      data-kind={type}
      data-invalid={invalid || undefined}
    >
      <span
        className="sands-heading-label"
        contentEditable={false}
        suppressContentEditableWarning
      >
        <Icon aria-hidden />
        <span>{spec.title}</span>
        {isPlayer ? (
          <span className="sands-heading-bit">· Player character</span>
        ) : null}
      </span>
      {spec.named ? (
        <div ref={contentRef} className="sands-heading-name" />
      ) : null}
      <Notes blockId={block.id} />
    </div>
  )
}

function briefHeadingSpec<T extends BriefBlockType>(type: T) {
  return createReactBlockSpec(briefBlockConfigs[type], {
    render: (props) => (
      <BriefHeading
        block={props.block as unknown as SandsBlock}
        contentRef={
          "contentRef" in props
            ? (props.contentRef as HeadingProps["contentRef"])
            : undefined
        }
      />
    ),
  })
}

export const briefHeadingSpecs = {
  setting: briefHeadingSpec("setting"),
  character: briefHeadingSpec("character"),
  arc: briefHeadingSpec("arc"),
  ending: briefHeadingSpec("ending"),
  location: briefHeadingSpec("location"),
  voice: briefHeadingSpec("voice"),
}

// Entry headings

function parseFlags(json: string) {
  try {
    return z.array(jevFlagSchema).parse(JSON.parse(json))
  } catch {
    return []
  }
}

export function entryBlockInfo(block: EntryBlock): EntryBlockInfo {
  const props = block.props
  return {
    blockId: block.id,
    entryId: props.entryId,
    kind: ENTRY_KIND_OF_BLOCK[block.type],
    name: inlineToText((block.content ?? []) as SandsInline[]).trim(),
    source: props.source as EntrySource,
    status: props.status as EntryStatus,
    sourceTurn: props.sourceTurn >= 0 ? props.sourceTurn : null,
    jevFlags: parseFlags(props.jevFlags),
  }
}

/** "C1 — Matching knife wounds" -> "C1". */
function handleOf(name: string) {
  return /^([A-Z]{1,2}\d{1,3})\b/u.exec(name)?.[1] ?? null
}

function JudgeFlag({ info }: { info: EntryBlockInfo }) {
  if (info.jevFlags.length === 0) return null
  const failed = info.jevFlags.some((flag) => flag.verdict === "fail")
  const summary = info.jevFlags
    .map(
      (flag) =>
        `${flag.prompt} p = ${formatProbability(flag.probability)}, ${flag.verdict === "fail" ? "failed" : "uncertain"}`
    )
    .join(" ")
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className="sands-heading-bit sands-heading-flag"
            data-failed={failed || undefined}
            aria-label={`Judge flag: ${summary}`}
          />
        }
      >
        · <FlagIcon aria-hidden /> {failed ? "Judge flag" : "Judge unsure"}
      </TooltipTrigger>
      <TooltipContent className="max-w-sm flex-col items-start gap-1">
        {info.jevFlags.map((flag) => (
          <span key={`${flag.question}-${flag.prompt}`}>
            {flag.prompt} p = {formatProbability(flag.probability)},{" "}
            {flag.verdict === "fail" ? "failed" : "uncertain"}
          </span>
        ))}
      </TooltipContent>
    </Tooltip>
  )
}

function EntryHeading({
  block,
  contentRef,
}: {
  block: EntryBlock
  contentRef: (node: HTMLElement | null) => void
}) {
  const ctx = useSandsEditorContext()
  const info = entryBlockInfo(block)
  const Icon = ENTRY_KIND_ICONS[info.kind]
  const handle = handleOf(info.name)
  const note = ctx.entryLabelNote?.(info)
  const locked = info.status === "locked"
  const invalid = (ctx.annotations.get(block.id) ?? []).some(
    (n) => n.severity === "error"
  )
  return (
    <div
      className="sands-heading"
      data-kind={info.kind}
      data-status={info.status}
      data-invalid={invalid || undefined}
    >
      <span
        className="sands-heading-label"
        contentEditable={false}
        suppressContentEditableWarning
      >
        <Icon aria-hidden />
        <span>{ENTRY_KIND_LABELS[info.kind].singular}</span>
        {handle ? <span className="sands-heading-bit">· {handle}</span> : null}
        <span className="sands-heading-bit">
          · {sourceLabel(info.source, info.sourceTurn).toLowerCase()}
        </span>
        <span className="sands-heading-bit sands-heading-status">
          · {locked ? <LockIcon aria-hidden /> : null}
          {entryStatusLabel(info.status).toLowerCase()}
        </span>
        <JudgeFlag info={info} />
        {note ? (
          <span className="sands-heading-bit sands-heading-note">· {note}</span>
        ) : null}
      </span>
      <div
        ref={contentRef}
        className="sands-heading-name"
        aria-readonly={locked || undefined}
      />
      <Notes blockId={block.id} />
    </div>
  )
}

function entryHeadingSpec<T extends EntryBlockType>(type: T) {
  return createReactBlockSpec(entryBlockConfigs[type], {
    render: (props) => (
      <EntryHeading
        block={props.block as unknown as EntryBlock}
        contentRef={props.contentRef}
      />
    ),
  })
}

export const entryHeadingSpecs = {
  locationEntry: entryHeadingSpec("locationEntry"),
  characterEntry: entryHeadingSpec("characterEntry"),
  npcEntry: entryHeadingSpec("npcEntry"),
  factionEntry: entryHeadingSpec("factionEntry"),
  clueEntry: entryHeadingSpec("clueEntry"),
  objectEntry: entryHeadingSpec("objectEntry"),
  exitConditionEntry: entryHeadingSpec("exitConditionEntry"),
  knowledgeEntry: entryHeadingSpec("knowledgeEntry"),
  decisiveActionEntry: entryHeadingSpec("decisiveActionEntry"),
}

function GroupDivider({ group }: { group: EntryGroup }) {
  const ctx = useSandsEditorContext()
  const counts = ENTRY_KINDS_BY_GROUP[group]
    .map((kind) => [kind, ctx.kindCounts[kind] ?? 0] as const)
    .filter(([, count]) => count > 0)
    .map(
      ([kind, count]) =>
        `${count} ${count === 1 ? ENTRY_KIND_LABELS[kind].singular : ENTRY_KIND_LABELS[kind].plural}`
    )
  return (
    <div
      className="sands-divider"
      role="separator"
      aria-label={ENTRY_GROUP_LABELS[group]}
      contentEditable={false}
      suppressContentEditableWarning
    >
      <span className="sands-divider-title">{ENTRY_GROUP_LABELS[group]}</span>
      {counts.length > 0 ? (
        <span className="sands-divider-counts">{counts.join(", ")}</span>
      ) : null}
    </div>
  )
}

export const createGroupDivider = createReactBlockSpec(entryGroupConfig, {
  meta: { selectable: false },
  render: (props) => (
    <GroupDivider group={(props.block.props as { group: EntryGroup }).group} />
  ),
})
