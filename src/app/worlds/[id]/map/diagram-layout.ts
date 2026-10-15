/**
 * Where the Story map draws each node, and where an arrow key goes from it.
 *
 * The spine runs top to bottom: Start, then the Arcs in story order. Each
 * Arc's Endings fork off to its right as a row of leaves, below a trunk that
 * leaves the Arc's right edge. Its Secrets and Promises sit to its left as
 * small markers, in columns of `PER_COL` that grow leftward.
 *
 * Arrow keys move by position: Up/Down along the spine, Right into an Arc's
 * Endings, Left to its markers.
 */
import {
  arcId,
  endingId,
  endingsFrom,
  promiseId,
  promisesAt,
  secretId,
  secretsAt,
  STORY_ID,
  type NodeId,
  type StoryMap,
} from "./model"

export const PAD = 32
export const START_H = 56
export const NODE_W = 240
export const START_W = NODE_W
export const ARC_H = 92
export const ROW_GAP = 48
export const MARKER = 28
export const MARKER_GAP = 6
/** Markers per column, stacked beside an Arc. */
export const PER_COL = 2
/** Space between the markers and their Arc. */
export const MARKER_INSET = 12
export const BRANCH_GAP = 40
/** How far below its Arc's top a leaf starts; the trunk runs above the leaves. */
export const LEAF_DROP = 44
/** The trunk's height on its Arc, from the Arc's top. */
export const TRUNK_Y = 18
export const LEAF_W = 220
export const LEAF_H = 68
export const LEAF_GAP = 16

export type Rect = { x: number; y: number; w: number; h: number }

export type Layout = {
  width: number
  height: number
  /** The left edge of the spine's column. */
  spineX: number
  start: Rect
  arcs: Rect[]
  /** Per Arc: the Endings forking off it, left to right. */
  leaves: NodeId[][]
  /** Per Arc: its Secrets then Promises, nearest the Arc first, top to bottom per column. */
  markers: NodeId[][]
  /** Every node the diagram draws, with its box. */
  rects: Map<NodeId, Rect>
}

export function layout(map: StoryMap): Layout {
  const count = map.arcs.length
  const leaves = map.arcs.map((a) =>
    endingsFrom(map, a.index).map((e) => endingId(e.index))
  )
  const markers = map.arcs.map((a) => [
    ...secretsAt(map, a.index).map((s) => secretId(s.index)),
    ...promisesAt(map, a.index).map((p) => promiseId(p.index)),
  ])
  const markerCols = Math.max(
    0,
    ...markers.map((m) => Math.ceil(m.length / PER_COL))
  )
  const spineX =
    PAD +
    (markerCols
      ? markerCols * MARKER + (markerCols - 1) * MARKER_GAP + MARKER_INSET
      : 0)

  const rects = new Map<NodeId, Rect>()
  const start: Rect = {
    x: spineX + (NODE_W - START_W) / 2,
    y: PAD,
    w: START_W,
    h: START_H,
  }
  rects.set(STORY_ID, start)

  const arcY = (i: number) => PAD + START_H + ROW_GAP + i * (ARC_H + ROW_GAP)
  const arcs = map.arcs.map((_, i) => {
    const rect = { x: spineX, y: arcY(i), w: NODE_W, h: ARC_H }
    rects.set(arcId(i), rect)
    return rect
  })

  const markerBlock = PER_COL * MARKER + (PER_COL - 1) * MARKER_GAP
  markers.forEach((row, i) =>
    row.forEach((id, m) => {
      const col = Math.floor(m / PER_COL)
      const r = m % PER_COL
      rects.set(id, {
        x: spineX - MARKER_INSET - MARKER - col * (MARKER + MARKER_GAP),
        y: arcY(i) + (ARC_H - markerBlock) / 2 + r * (MARKER + MARKER_GAP),
        w: MARKER,
        h: MARKER,
      })
    })
  )

  leaves.forEach((row, i) =>
    row.forEach((id, k) => {
      rects.set(id, {
        x: spineX + NODE_W + BRANCH_GAP + k * (LEAF_W + LEAF_GAP),
        y: arcY(i) + LEAF_DROP,
        w: LEAF_W,
        h: LEAF_H,
      })
    })
  )

  let right = spineX + NODE_W
  let bottom = count ? arcY(count - 1) + ARC_H : start.y + START_H
  for (const rect of rects.values()) {
    right = Math.max(right, rect.x + rect.w)
    bottom = Math.max(bottom, rect.y + rect.h)
  }

  return {
    width: right + PAD,
    height: bottom + PAD,
    spineX,
    start,
    arcs,
    leaves,
    markers,
    rects,
  }
}

export type Dir = "up" | "down" | "left" | "right"

/**
 * The nearest row in `dir` (from Arc `from`) that has items, and its item in
 * the same place, clamped to that row's length.
 */
function nearestRow(
  rows: NodeId[][],
  from: number,
  dir: "up" | "down",
  pick: (row: NodeId[]) => NodeId
): NodeId | null {
  const step = dir === "up" ? -1 : 1
  for (let j = from + step; j >= 0 && j < rows.length; j += step) {
    if (rows[j].length) return pick(rows[j])
  }
  return null
}

/** Where an arrow key goes from a node, by the diagram's geometry; null stays put. */
export function neighbor(lay: Layout, id: NodeId, dir: Dir): NodeId | null {
  const count = lay.arcs.length
  if (id === STORY_ID) return dir === "down" && count ? arcId(0) : null

  for (let i = 0; i < count; i++) {
    if (id === arcId(i)) {
      if (dir === "up") return i === 0 ? STORY_ID : arcId(i - 1)
      if (dir === "down") return i + 1 < count ? arcId(i + 1) : null
      if (dir === "right") return lay.leaves[i][0] ?? null
      return lay.markers[i][0] ?? null
    }

    const k = lay.leaves[i].indexOf(id)
    if (k >= 0) {
      if (dir === "left") return k === 0 ? arcId(i) : lay.leaves[i][k - 1]
      if (dir === "right") return lay.leaves[i][k + 1] ?? null
      return nearestRow(
        lay.leaves,
        i,
        dir,
        (row) => row[Math.min(k, row.length - 1)]
      )
    }

    const m = lay.markers[i].indexOf(id)
    if (m >= 0) {
      const row = lay.markers[i]
      const col = Math.floor(m / PER_COL)
      const r = m % PER_COL
      if (dir === "right") return col === 0 ? arcId(i) : row[m - PER_COL]
      if (dir === "left") return row[m + PER_COL] ?? null
      if (dir === "up" && r > 0) return row[m - 1]
      if (dir === "down" && r + 1 < PER_COL && row[m + 1]) return row[m + 1]
      // Past the column's end: the same column of the next Arc with markers.
      return nearestRow(lay.markers, i, dir, (next) => {
        const target = col * PER_COL + (dir === "up" ? PER_COL - 1 : 0)
        return next[Math.min(target, next.length - 1)]
      })
    }
  }
  return null
}
