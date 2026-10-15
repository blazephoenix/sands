"use client"

/**
 * The Story map's diagram: HTML nodes over an SVG of edges. The Arc spine
 * runs top to bottom in story order; each Ending forks off to the right of
 * its Earliest Arc; Secrets and Promises are markers to the left of theirs.
 * Geometry and arrow-key moves live in `diagram-layout.ts`.
 *
 * Pan by dragging the background or scrolling; zoom with the buttons,
 * Ctrl/Cmd + wheel, or + / − / 0. Arrow keys move by position between
 * nodes (one tab stop for the whole diagram); Enter/Space select.
 */
import * as React from "react"
import {
  ScanIcon,
  TriangleAlertIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import { InlineText, KIND_TEXT, NodeIcon } from "./detail-pane"
import {
  ARC_H,
  layout,
  NODE_W,
  neighbor,
  TRUNK_Y,
  type Dir,
  type Rect,
} from "./diagram-layout"
import {
  arcId,
  firesFrom,
  KIND_LABEL,
  nodeLabel,
  STORY_ID,
  type KindKey,
  type NodeId,
  type StoryMap,
} from "./model"

const ZOOM_MIN = 0.4
const ZOOM_MAX = 1.6
const ZOOM_STEP = 0.1
/** The stub's horizontal offset into its leaf, and its corner radius. */
const STUB_X = 20
const STUB_R = 8

/** Token colour and line style per Kind: never colour alone. */
const LEAF_BORDER: Record<KindKey, string> = {
  good: "border-foreground/50",
  bad: "border-destructive/60",
  neutral: "border-dashed border-muted-foreground/60",
  unset: "border-dashed border-muted-foreground/60",
}

const EDGE: Record<KindKey, { className: string; dash?: string }> = {
  good: { className: "text-foreground/60" },
  bad: { className: "text-destructive" },
  neutral: { className: "text-muted-foreground", dash: "4 4" },
  unset: { className: "text-muted-foreground", dash: "2 4" },
}

const ARROWS: Record<string, Dir> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
}

const clampZoom = (z: number) =>
  Math.round(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z)) * 10) / 10

const place = (rect: Rect): React.CSSProperties => ({
  left: rect.x,
  top: rect.y,
  width: rect.w,
  height: rect.h,
})

export function StoryMapDiagram({
  map,
  selected,
  onSelect,
}: {
  map: StoryMap
  selected: NodeId | null
  onSelect: (id: NodeId) => void
}) {
  const lay = React.useMemo(() => layout(map), [map])
  const [zoom, setZoom] = React.useState(1)
  const [focused, setFocused] = React.useState<NodeId>(selected ?? arcId(0))
  const moveFocus = React.useRef(false)
  const scroller = React.useRef<HTMLDivElement>(null)
  const drag = React.useRef<{
    x: number
    y: number
    left: number
    top: number
  } | null>(null)

  // A selection made elsewhere (the detail pane) becomes the focused node.
  const [seen, setSeen] = React.useState(selected)
  if (selected !== seen) {
    setSeen(selected)
    if (selected && lay.rects.has(selected)) setFocused(selected)
  }
  // The focused node may be gone after the Skeleton changed.
  const current = lay.rects.has(focused) ? focused : arcId(0)

  React.useEffect(() => {
    const element =
      scroller.current?.querySelector<HTMLElement>(
        `[data-node="${current}"]`
      ) ?? null
    if (moveFocus.current) {
      moveFocus.current = false
      element?.focus()
    }
    // Instant, so reduced motion needs nothing more.
    element?.scrollIntoView({ block: "nearest", inline: "nearest" })
  }, [current])

  // Ctrl/Cmd + wheel zooms; a plain wheel scrolls (pans).
  React.useEffect(() => {
    const el = scroller.current
    if (!el) return
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return
      event.preventDefault()
      setZoom((z) => clampZoom(z + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP)))
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [])

  const fit = () => {
    const el = scroller.current
    if (!el) return
    setZoom(
      clampZoom(
        Math.min(1, el.clientWidth / lay.width, el.clientHeight / lay.height)
      )
    )
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return
    const dir = ARROWS[event.key]
    if (dir) {
      const next = neighbor(lay, current, dir)
      if (next) {
        moveFocus.current = true
        setFocused(next)
      }
    } else if (event.key === "Enter" || event.key === " ") {
      onSelect(current)
    } else if (event.key === "+" || event.key === "=") {
      setZoom((z) => clampZoom(z + ZOOM_STEP))
    } else if (event.key === "-") {
      setZoom((z) => clampZoom(z - ZOOM_STEP))
    } else if (event.key === "0") {
      setZoom(1)
    } else return
    event.preventDefault()
  }

  const nodeProps = (id: NodeId) => ({
    "data-node": id,
    tabIndex: id === current ? 0 : -1,
    "aria-current": id === selected ? ("true" as const) : undefined,
    onFocus: () => setFocused(id),
    onClick: () => {
      setFocused(id)
      onSelect(id)
    },
  })

  const nodeClass = (id: NodeId) =>
    cn(
      "absolute rounded-lg border bg-card text-left text-card-foreground outline-none",
      "transition-shadow motion-reduce:transition-none",
      "hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
      id === selected && "ring-2 ring-primary"
    )

  const spineMidX = lay.spineX + NODE_W / 2
  const lastArc = lay.arcs.at(-1)

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-1.5">
        <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> along the Arcs, <Kbd>←</Kbd>
          <Kbd>→</Kbd> to what forks off them, <Kbd>Enter</Kbd> selects, drag or
          scroll to pan
        </p>
        <div className="flex items-center gap-1">
          <ZoomButton
            label="Zoom out"
            keys="−"
            onClick={() => setZoom((z) => clampZoom(z - ZOOM_STEP))}
            disabled={zoom <= ZOOM_MIN}
          >
            <ZoomOutIcon />
          </ZoomButton>
          <span
            className="w-10 text-center text-xs text-muted-foreground tabular-nums"
            aria-live="polite"
          >
            {Math.round(zoom * 100)}%
          </span>
          <ZoomButton
            label="Zoom in"
            keys="+"
            onClick={() => setZoom((z) => clampZoom(z + ZOOM_STEP))}
            disabled={zoom >= ZOOM_MAX}
          >
            <ZoomInIcon />
          </ZoomButton>
          <ZoomButton label="Fit to view" keys="0 resets" onClick={fit}>
            <ScanIcon />
          </ZoomButton>
        </div>
      </div>
      <div
        ref={scroller}
        className="min-h-0 flex-1 cursor-grab overflow-auto bg-muted/30 active:cursor-grabbing"
        onPointerDown={(event) => {
          if ((event.target as HTMLElement).closest("button")) return
          if (event.button !== 0) return
          const el = event.currentTarget
          drag.current = {
            x: event.clientX,
            y: event.clientY,
            left: el.scrollLeft,
            top: el.scrollTop,
          }
          el.setPointerCapture(event.pointerId)
        }}
        onPointerMove={(event) => {
          const d = drag.current
          if (!d) return
          const el = event.currentTarget
          el.scrollLeft = d.left - (event.clientX - d.x)
          el.scrollTop = d.top - (event.clientY - d.y)
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        <div
          style={{ width: lay.width * zoom, height: lay.height * zoom }}
          className="relative"
        >
          <div
            role="group"
            aria-label="Story map"
            onKeyDown={onKeyDown}
            className="absolute top-0 left-0 origin-top-left"
            style={{
              width: lay.width,
              height: lay.height,
              transform: `scale(${zoom})`,
            }}
          >
            <svg
              aria-hidden
              width={lay.width}
              height={lay.height}
              className="absolute inset-0 overflow-visible"
              fill="none"
            >
              {/* The spine, behind the nodes. */}
              {lastArc ? (
                <line
                  x1={spineMidX}
                  y1={lay.start.y + lay.start.h / 2}
                  x2={spineMidX}
                  y2={lastArc.y + ARC_H / 2}
                  className="text-foreground/40"
                  stroke="currentColor"
                  strokeWidth={2}
                />
              ) : null}
              {/* Forks: a trunk off each Arc's right edge, a stub down to each Ending. */}
              {lay.leaves.map((row, i) => {
                if (row.length === 0) return null
                const arc = lay.arcs[i]
                const trunkY = arc.y + TRUNK_Y
                const lastX = lay.rects.get(row[row.length - 1])!.x + STUB_X
                return (
                  <g key={i}>
                    <line
                      x1={arc.x + arc.w}
                      y1={trunkY}
                      x2={lastX - STUB_R}
                      y2={trunkY}
                      className="text-border"
                      stroke="currentColor"
                      strokeWidth={2}
                    />
                    {row.map((id) => {
                      const ending = map.endings[Number(id.split(":")[1])]
                      const leaf = lay.rects.get(id)!
                      const x = leaf.x + STUB_X
                      const edge = EDGE[ending.kind]
                      return (
                        <path
                          key={id}
                          d={`M ${x - STUB_R} ${trunkY} Q ${x} ${trunkY} ${x} ${trunkY + STUB_R} V ${leaf.y}`}
                          className={edge.className}
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeDasharray={edge.dash}
                        />
                      )
                    })}
                  </g>
                )
              })}
            </svg>

            <button
              type="button"
              {...nodeProps(STORY_ID)}
              aria-label={`Start: ${nodeLabel(map, STORY_ID)}`}
              className={cn(
                nodeClass(STORY_ID),
                "flex flex-col items-center justify-center rounded-full px-4 text-center"
              )}
              style={place(lay.start)}
            >
              <span className="text-xs text-muted-foreground">Start</span>
              <InlineText
                value={map.skeleton.story.title}
                fallback="Untitled story"
                className="max-w-full text-sm font-medium"
              />
            </button>

            {map.arcs.map(({ index, arc }) => {
              const id = arcId(index)
              return (
                <button
                  key={id}
                  type="button"
                  {...nodeProps(id)}
                  className={cn(nodeClass(id), "flex flex-col gap-1 p-3")}
                  style={place(lay.arcs[index])}
                >
                  <span className="flex min-w-0 items-center gap-1.5 text-sm">
                    <span className="shrink-0 text-xs text-muted-foreground">
                      Arc {index + 1}
                    </span>
                    <InlineText
                      value={arc.name}
                      fallback="Unnamed Arc"
                      className="font-medium"
                    />
                  </span>
                  <span className="line-clamp-2 text-xs leading-snug text-muted-foreground">
                    <InlineText
                      value={arc.function}
                      fallback="No Function yet"
                      className="whitespace-normal"
                    />
                  </span>
                </button>
              )
            })}

            {lay.leaves.flat().map((id) => {
              const e = map.endings[Number(id.split(":")[1])]
              return (
                <button
                  key={id}
                  type="button"
                  {...nodeProps(id)}
                  className={cn(
                    nodeClass(id),
                    "flex flex-col gap-0.5 px-3 py-2",
                    LEAF_BORDER[e.kind]
                  )}
                  style={place(lay.rects.get(id)!)}
                >
                  <span className="flex min-w-0 items-center gap-1.5 text-sm">
                    <NodeIcon map={map} id={id} />
                    <InlineText
                      value={e.ending.name}
                      fallback={`Ending ${e.index + 1}`}
                      className="font-medium"
                    />
                  </span>
                  <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                    {e.unmatched ? (
                      <>
                        <TriangleAlertIcon
                          aria-hidden
                          className="size-3.5 shrink-0 text-destructive"
                        />
                        <span className="sr-only">
                          Its Earliest Arc names no Arc.
                        </span>
                      </>
                    ) : null}
                    <span className="truncate">
                      <span className={KIND_TEXT[e.kind]}>
                        {KIND_LABEL[e.kind]}
                      </span>
                      {" · "}
                      {firesFrom(e)}
                    </span>
                  </span>
                </button>
              )
            })}

            {lay.markers.flat().map((id) => {
              const isSecret = id.startsWith("secret")
              const item = isSecret
                ? map.secrets[Number(id.split(":")[1])]
                : map.promises[Number(id.split(":")[1])]
              const label = `${isSecret ? "Secret" : "Promise"}: ${nodeLabel(map, id)}${
                item.unmatched ? ". Its Earliest Arc names no Arc." : ""
              }`
              return (
                <Tooltip key={id}>
                  <TooltipTrigger
                    {...nodeProps(id)}
                    aria-label={label}
                    className={cn(
                      nodeClass(id),
                      "flex items-center justify-center rounded-full"
                    )}
                    style={place(lay.rects.get(id)!)}
                  >
                    {item.unmatched ? (
                      <TriangleAlertIcon
                        aria-hidden
                        className="size-3.5 text-destructive"
                      />
                    ) : (
                      <NodeIcon map={map} id={id} className="size-3.5" />
                    )}
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">{label}</TooltipContent>
                </Tooltip>
              )
            })}
          </div>
        </div>
      </div>
      <Legend />
    </div>
  )
}

function ZoomButton({
  label,
  keys,
  onClick,
  disabled,
  children,
}: {
  label: string
  keys: string
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            onClick={onClick}
            disabled={disabled}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>
        {label}
        <Kbd>{keys}</Kbd>
      </TooltipContent>
    </Tooltip>
  )
}

function Legend() {
  const items: { kind: KindKey; label: string }[] = [
    { kind: "good", label: "Good Ending" },
    { kind: "bad", label: "Bad Ending" },
    { kind: "neutral", label: "Neutral Ending" },
  ]
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-3 py-1.5 text-xs text-muted-foreground">
      {items.map(({ kind, label }) => (
        <span key={kind} className="flex items-center gap-1.5">
          <svg
            aria-hidden
            width="20"
            height="4"
            className={EDGE[kind].className}
          >
            <line
              x1="0"
              y1="2"
              x2="20"
              y2="2"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray={EDGE[kind].dash}
            />
          </svg>
          {label}
        </span>
      ))}
      <span className="flex items-center gap-1.5">
        <span aria-hidden className="size-3 rounded-full border bg-card" />
        Secret or Promise, beside its Earliest Arc
      </span>
    </div>
  )
}
