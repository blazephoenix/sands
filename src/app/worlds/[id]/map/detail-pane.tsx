"use client"

/**
 * The Story map's pieces besides the diagram: Skeleton text with its Hidden
 * runs (shown to the Author muted, with `.sands-hidden`), the icons for each
 * kind of node, the detail pane that shows a selected node in full with an
 * "Edit in Skeleton" link to its row, and the State flags legend.
 */
import * as React from "react"
import Link from "next/link"
import {
  ArrowRightIcon,
  CircleCheckIcon,
  CircleDotIcon,
  CircleHelpIcon,
  CircleMinusIcon,
  CircleXIcon,
  FlagIcon,
  HandshakeIcon,
  KeyRoundIcon,
  PencilIcon,
  ToggleLeftIcon,
  TriangleAlertIcon,
  UserRoundIcon,
  BookOpenIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { skeletonHref } from "@/components/worlds/world-links"
import type { World } from "@/domain/world"
import { cn } from "@/lib/utils"
import { toSegments, type Segment } from "@/skeleton/hidden-text"

import {
  agendaId,
  arcId,
  endingId,
  endingsDuring,
  flagId,
  KIND_LABEL,
  nodeLabel,
  promiseId,
  promisesAt,
  resolveNode,
  secretId,
  secretsAt,
  type KindKey,
  type NodeId,
  type Placement,
  type ResolvedNode,
  type StoryMap,
} from "./model"

/* ------------------------------------------------------------------ text */

/** A field's runs split into lines; a Hidden run may span several lines. */
export function toLines(value: string): Segment[][] {
  const lines: Segment[][] = [[]]
  for (const segment of toSegments(value)) {
    segment.text.split("\n").forEach((part, i) => {
      if (i > 0) lines.push([])
      if (part) lines[lines.length - 1].push({ ...segment, text: part })
    })
  }
  return lines.filter((line) => line.some((s) => s.text.trim()))
}

function Runs({ segments }: { segments: Segment[] }) {
  return (
    <>
      {segments.map((segment, i) =>
        segment.hidden ? (
          <span key={i} className="sands-hidden">
            {segment.text}
          </span>
        ) : (
          <React.Fragment key={i}>{segment.text}</React.Fragment>
        )
      )}
    </>
  )
}

/** A Skeleton field, its Hidden text shown muted with a dashed underline. */
export function HiddenText({
  value,
  fallback,
  className,
}: {
  value: string
  fallback?: string
  className?: string
}) {
  const segments = toSegments(value.trim())
  if (segments.length === 0)
    return fallback ? (
      <span className={cn("text-muted-foreground", className)}>{fallback}</span>
    ) : null
  return (
    <span className={cn("whitespace-pre-line", className)}>
      <Runs segments={segments} />
    </span>
  )
}

/** A one-line field (a name in a row), clipped. */
export function InlineText({
  value,
  fallback,
  className,
}: {
  value: string
  fallback: string
  className?: string
}) {
  const segments = toSegments(value.replaceAll("\n", " ").trim())
  return (
    // Bottom padding keeps a Hidden run's dashed underline inside the clip.
    <span className={cn("truncate pb-1", className)}>
      {segments.length ? (
        <Runs segments={segments} />
      ) : (
        <span className="text-muted-foreground">{fallback}</span>
      )}
    </span>
  )
}

/* ----------------------------------------------------------------- icons */

export const KIND_ICON: Record<KindKey, typeof CircleCheckIcon> = {
  good: CircleCheckIcon,
  bad: CircleXIcon,
  neutral: CircleMinusIcon,
  unset: CircleHelpIcon,
}

/** Token colour per Kind: never colour alone; always with its icon and label. */
export const KIND_TEXT: Record<KindKey, string> = {
  good: "text-foreground",
  bad: "text-destructive",
  neutral: "text-muted-foreground",
  unset: "text-muted-foreground",
}

export function KindBadge({ kind }: { kind: KindKey }) {
  const Icon = KIND_ICON[kind]
  return (
    <Badge
      variant={kind === "bad" ? "destructive" : "outline"}
      className={cn(
        kind === "neutral" || kind === "unset" ? "text-muted-foreground" : null
      )}
    >
      <Icon data-icon="inline-start" aria-hidden />
      {KIND_LABEL[kind]}
    </Badge>
  )
}

export const TYPE_ICON = {
  story: BookOpenIcon,
  arc: CircleDotIcon,
  ending: FlagIcon,
  secret: KeyRoundIcon,
  promise: HandshakeIcon,
  agenda: UserRoundIcon,
  flag: ToggleLeftIcon,
} as const

export const TYPE_LABEL: Record<ResolvedNode["type"], string> = {
  story: "Story",
  arc: "Arc",
  ending: "Ending",
  secret: "Secret",
  promise: "Promise",
  agenda: "Agenda",
  flag: "State flag",
}

/** The icon for a node: its Kind's for an Ending, its type's otherwise. */
export function NodeIcon({
  map,
  id,
  className,
}: {
  map: StoryMap
  id: NodeId
  className?: string
}) {
  const node = resolveNode(map, id)
  if (!node) return null
  if (node.type === "ending") {
    const Icon = KIND_ICON[node.item.kind]
    return (
      <Icon
        aria-hidden
        className={cn("size-4 shrink-0", KIND_TEXT[node.item.kind], className)}
      />
    )
  }
  const Icon = TYPE_ICON[node.type]
  return (
    <Icon
      aria-hidden
      className={cn("size-4 shrink-0 text-muted-foreground", className)}
    />
  )
}

/* ----------------------------------------------------------- edit links */

const SECTION_OF: Record<ResolvedNode["type"], string> = {
  story: "story",
  arc: "arcs",
  ending: "endings",
  secret: "secrets",
  promise: "promises",
  agenda: "arcs",
  flag: "stateFlags",
}

/** The Skeleton editor, open on the node's row where it has one. */
export function editHref(world: World, node: ResolvedNode) {
  const section = SECTION_OF[node.type]
  const search = new URLSearchParams({ section })
  const rowIndex =
    node.type === "story"
      ? null
      : node.type === "agenda"
        ? node.arc.index
        : node.item.index
  const rows = (world.document as Record<string, { id: string }[] | unknown>)[
    section
  ]
  if (rowIndex !== null && Array.isArray(rows)) {
    const id = (rows[rowIndex] as { id?: string } | undefined)?.id
    if (id) search.set("row", id)
  }
  return `${skeletonHref(world.id)}?${search}`
}

/* ---------------------------------------------------------- detail pane */

function Field({
  label,
  value,
  list,
  ordered,
}: {
  label: string
  value: string
  /** One item per line. */
  list?: boolean
  ordered?: boolean
}) {
  const lines = list ? toLines(value) : []
  const ListTag = ordered ? "ol" : "ul"
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="max-w-prose text-sm leading-relaxed">
        {list && lines.length > 0 ? (
          <ListTag
            className={cn(
              "flex flex-col gap-1 pl-5",
              ordered ? "list-decimal" : "list-disc"
            )}
          >
            {lines.map((line, i) => (
              <li key={i}>
                <Runs segments={line} />
              </li>
            ))}
          </ListTag>
        ) : (
          <HiddenText value={value} fallback="Not written yet." />
        )}
      </dd>
    </div>
  )
}

/** A link to another node inside the detail pane. */
function NodeChip({
  map,
  id,
  onSelect,
}: {
  map: StoryMap
  id: NodeId
  onSelect: (id: NodeId) => void
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="h-auto max-w-full justify-start py-1 text-left whitespace-normal"
      onClick={() => onSelect(id)}
    >
      <NodeIcon map={map} id={id} />
      <span className="line-clamp-2">{nodeLabel(map, id)}</span>
    </Button>
  )
}

function ChipGroup({
  label,
  ids,
  map,
  onSelect,
}: {
  label: string
  ids: NodeId[]
  map: StoryMap
  onSelect: (id: NodeId) => void
}) {
  if (ids.length === 0) return null
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="text-xs font-medium text-muted-foreground">{label}</h3>
      <div className="flex flex-wrap gap-1.5">
        {ids.map((id) => (
          <NodeChip key={id} map={map} id={id} onSelect={onSelect} />
        ))}
      </div>
    </div>
  )
}

function PlacementNote({
  map,
  placement,
  what,
}: {
  map: StoryMap
  placement: Placement
  what: string
}) {
  if (placement.unmatched)
    return (
      <p className="flex items-start gap-1.5 text-sm text-destructive">
        <TriangleAlertIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
        Its Earliest Arc names no Arc in this Skeleton, so it is shown at the
        first Arc.
      </p>
    )
  if (placement.blank)
    return (
      <p className="text-sm text-muted-foreground">
        No Earliest Arc: {what} from the first Arc.
      </p>
    )
  return (
    <p className="text-sm text-muted-foreground">
      Earliest Arc: Arc {placement.arc + 1},{" "}
      {nodeLabel(map, arcId(placement.arc))}.
    </p>
  )
}

export function DetailPane({
  map,
  world,
  selected,
  onSelect,
  className,
}: {
  map: StoryMap
  world: World
  selected: NodeId | null
  onSelect: (id: NodeId) => void
  className?: string
}) {
  const node = selected ? resolveNode(map, selected) : null
  return (
    <section
      aria-label="Details"
      aria-live="polite"
      className={cn("flex min-h-0 flex-col overflow-y-auto", className)}
    >
      {node && selected ? (
        <DetailBody
          map={map}
          world={world}
          id={selected}
          node={node}
          onSelect={onSelect}
        />
      ) : (
        <p className="p-6 text-sm text-muted-foreground">
          Select an Arc, an Ending, a Secret or a Promise to see it in full.
        </p>
      )}
    </section>
  )
}

function DetailBody({
  map,
  world,
  id,
  node,
  onSelect,
}: {
  map: StoryMap
  world: World
  id: NodeId
  node: ResolvedNode
  onSelect: (id: NodeId) => void
}) {
  return (
    <div className="flex flex-col gap-5 p-6">
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <NodeIcon map={map} id={id} className="size-3.5" />
            {TYPE_LABEL[node.type]}
            {node.type === "arc" ? ` ${node.item.index + 1}` : null}
          </span>
          <Button
            variant="ghost"
            size="xs"
            nativeButton={false}
            render={<Link href={editHref(world, node)} />}
          >
            <PencilIcon data-icon="inline-start" aria-hidden />
            Edit in Skeleton
          </Button>
        </div>
        <h2 className="font-heading text-lg leading-snug font-semibold">
          <DetailTitle map={map} node={node} />
        </h2>
        {node.type === "ending" ? (
          <div className="flex flex-wrap items-center gap-2">
            <KindBadge kind={node.item.kind} />
            <span className="text-sm text-muted-foreground">
              Can fire from Arc {node.item.arc + 1} on
            </span>
          </div>
        ) : null}
      </header>
      <Separator />
      <DetailFields map={map} node={node} onSelect={onSelect} />
    </div>
  )
}

function DetailTitle({ map, node }: { map: StoryMap; node: ResolvedNode }) {
  switch (node.type) {
    case "story":
      return (
        <HiddenText
          value={map.skeleton.story.title}
          fallback="Untitled story"
        />
      )
    case "arc":
      return <HiddenText value={node.item.arc.name} fallback="Unnamed Arc" />
    case "ending":
      return (
        <HiddenText value={node.item.ending.name} fallback="Unnamed Ending" />
      )
    case "secret":
      return (
        <HiddenText
          value={node.item.secret.secret}
          fallback="Unwritten Secret"
        />
      )
    case "promise":
      return (
        <HiddenText
          value={node.item.promise.promise}
          fallback="Unwritten Promise"
        />
      )
    case "agenda":
      return (
        <HiddenText value={node.agenda.character} fallback="No character" />
      )
    case "flag":
      return (
        <HiddenText value={node.item.flag.flag} fallback="Unnamed State flag" />
      )
  }
}

function DetailFields({
  map,
  node,
  onSelect,
}: {
  map: StoryMap
  node: ResolvedNode
  onSelect: (id: NodeId) => void
}) {
  switch (node.type) {
    case "story": {
      const { story } = map.skeleton
      return (
        <div className="flex flex-col gap-5">
          <dl className="flex flex-col gap-4">
            <Field label="Premise" value={story.premise} />
          </dl>
          <p className="text-sm text-muted-foreground">
            {map.arcs.length} Arcs, {map.endings.length} Endings,{" "}
            {map.secrets.length} Secrets, {map.promises.length} Promises.{" "}
            {map.skeleton.writerMayInventEndings
              ? "The Writer may also end on an Ending it invents."
              : "The Writer may end only on these Endings."}
          </p>
          <ChipGroup
            label="Arcs"
            ids={map.arcs.map((a) => arcId(a.index))}
            map={map}
            onSelect={onSelect}
          />
        </div>
      )
    }
    case "arc": {
      const { arc, index } = node.item
      return (
        <div className="flex flex-col gap-5">
          <dl className="flex flex-col gap-4">
            <Field label="Function" value={arc.function} />
            <Field label="Description" value={arc.description} />
            <Field label="Set pieces" value={arc.setPieces} list />
            <Field label="Must-land moments" value={arc.mustLandMoments} list />
            <Field label="Stakes" value={arc.stakes} />
            <Field label="If landed early" value={arc.ifLandedEarly} />
          </dl>
          {arc.agendas.length > 0 ? (
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-medium text-muted-foreground">
                Agendas
              </h3>
              {arc.agendas.map((agenda, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-3 rounded-lg border p-3"
                >
                  <button
                    type="button"
                    onClick={() => onSelect(agendaId(index, i))}
                    className="flex items-center gap-1.5 self-start rounded-sm text-sm font-medium outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <UserRoundIcon
                      aria-hidden
                      className="size-4 text-muted-foreground"
                    />
                    <HiddenText
                      value={agenda.character}
                      fallback="No character"
                    />
                  </button>
                  <AgendaFields agenda={agenda} />
                </div>
              ))}
            </div>
          ) : null}
          <ChipGroup
            label="Endings that can fire during this Arc"
            ids={endingsDuring(map, index).map((e) => endingId(e.index))}
            map={map}
            onSelect={onSelect}
          />
          <ChipGroup
            label="Secrets that may surface from here"
            ids={secretsAt(map, index).map((s) => secretId(s.index))}
            map={map}
            onSelect={onSelect}
          />
          <ChipGroup
            label="Promises that may pay off from here"
            ids={promisesAt(map, index).map((p) => promiseId(p.index))}
            map={map}
            onSelect={onSelect}
          />
        </div>
      )
    }
    case "ending": {
      const item = node.item
      const arcs = map.arcs.filter((a) => a.index >= item.arc)
      return (
        <div className="flex flex-col gap-5">
          <dl className="flex flex-col gap-4">
            <Field label="Ending trigger" value={item.ending.trigger} />
          </dl>
          <PlacementNote map={map} placement={item} what="it can fire" />
          <ChipGroup
            label="Arcs during which it can fire"
            ids={arcs.map((a) => arcId(a.index))}
            map={map}
            onSelect={onSelect}
          />
        </div>
      )
    }
    case "secret": {
      const { secret } = node.item
      return (
        <div className="flex flex-col gap-5">
          <dl className="flex flex-col gap-4">
            <Field label="Who knows" value={secret.whoKnows} />
            <Field label="How it surfaces" value={secret.howItSurfaces} />
            <Field
              label="What the Player can do with it"
              value={secret.whatPlayerCanDo}
            />
          </dl>
          <PlacementNote
            map={map}
            placement={node.item}
            what="it may surface"
          />
          <ChipGroup
            label="Earliest Arc"
            ids={[arcId(node.item.arc)].filter(() => map.arcs.length > 0)}
            map={map}
            onSelect={onSelect}
          />
        </div>
      )
    }
    case "promise": {
      const { promise } = node.item
      return (
        <div className="flex flex-col gap-5">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-start">
            <dl className="rounded-lg border p-3">
              <Field label="Setup" value={promise.setup} />
            </dl>
            <ArrowRightIcon
              aria-hidden
              className="hidden size-4 self-center text-muted-foreground sm:block"
            />
            <dl className="rounded-lg border p-3">
              <Field label="Payoff" value={promise.payoff} />
            </dl>
          </div>
          <PlacementNote
            map={map}
            placement={node.item}
            what="it may pay off"
          />
          <ChipGroup
            label="Earliest Arc"
            ids={[arcId(node.item.arc)].filter(() => map.arcs.length > 0)}
            map={map}
            onSelect={onSelect}
          />
        </div>
      )
    }
    case "agenda":
      return (
        <div className="flex flex-col gap-5">
          <AgendaFields agenda={node.agenda} />
          <ChipGroup
            label="Arc"
            ids={[arcId(node.arc.index)]}
            map={map}
            onSelect={onSelect}
          />
        </div>
      )
    case "flag": {
      const values = toLines(node.item.flag.values)
      const epilogue = toLines(node.item.flag.epilogue)
      return (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Play sets one value; the Epilogue closes on its line.
          </p>
          {values.length === 0 ? (
            <p className="text-sm text-muted-foreground">No values yet.</p>
          ) : (
            <dl className="flex flex-col gap-3">
              {values.map((value, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-1 rounded-lg border p-3"
                >
                  <dt className="text-sm font-medium">
                    <Runs segments={value} />
                  </dt>
                  <dd className="max-w-prose text-sm leading-relaxed text-muted-foreground">
                    {epilogue[i] ? (
                      <Runs segments={epilogue[i]} />
                    ) : (
                      "No Epilogue line yet."
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )
    }
  }
}

function AgendaFields({ agenda }: { agenda: ResolvedNodeAgenda }) {
  return (
    <dl className="flex flex-col gap-3">
      <Field label="Want for this Arc" value={agenda.want} />
      <Field label="Steps" value={agenda.steps} list ordered />
      <Field label="If blocked" value={agenda.ifBlocked} />
    </dl>
  )
}

type ResolvedNodeAgenda = Extract<ResolvedNode, { type: "agenda" }>["agenda"]

/* ---------------------------------------------------------- flag legend */

/** The State flags as a compact list: they feed the Epilogue. */
export function FlagLegend({
  map,
  selected,
  onSelect,
  className,
}: {
  map: StoryMap
  selected: NodeId | null
  onSelect: (id: NodeId) => void
  className?: string
}) {
  return (
    <section
      aria-labelledby="flag-legend-title"
      className={cn("flex flex-col gap-2", className)}
    >
      <h2
        id="flag-legend-title"
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
      >
        <ToggleLeftIcon aria-hidden className="size-3.5" />
        State flags, for the Epilogue
      </h2>
      {map.flags.length === 0 ? (
        <p className="text-xs text-muted-foreground">No State flags yet.</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {map.flags.map((f) => {
            const id = flagId(f.index)
            const count = toLines(f.flag.values).length
            return (
              <li key={id}>
                <Button
                  variant={selected === id ? "secondary" : "outline"}
                  size="xs"
                  aria-pressed={selected === id}
                  onClick={() => onSelect(id)}
                >
                  <InlineText
                    value={f.flag.flag}
                    fallback={`State flag ${f.index + 1}`}
                    className="max-w-48"
                  />
                  <span className="text-muted-foreground">{count}</span>
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
