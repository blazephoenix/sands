import { describe, expect, it } from "vitest"

import { emptySkeleton, type Arc, type Skeleton } from "@/domain/skeleton"
import { hidden } from "@/skeleton/hidden-text"

import { layout, neighbor, PER_COL } from "./diagram-layout"
import {
  arcId,
  buildStoryMap,
  endingId,
  endingsDuring,
  endingsFrom,
  firesFrom,
  promiseId,
  promisesAt,
  secretId,
  secretsAt,
  STORY_ID,
} from "./model"

function arc(name: string): Arc {
  return {
    name,
    description: "",
    function: "",
    setPieces: "",
    mustLandMoments: "",
    stakes: "",
    ifLandedEarly: "",
    agendas: [],
  }
}

function ending(name: string, earliestArc: string, kind = "good") {
  return { name, kind, trigger: "", earliestArc }
}

function secret(text: string, earliestArc: string) {
  return {
    secret: text,
    whoKnows: "",
    howItSurfaces: "",
    earliestArc,
    whatPlayerCanDo: "",
  }
}

function promise(text: string, earliestArc: string) {
  return { promise: text, setup: "", payoff: "", earliestArc }
}

function skeleton(parts: Partial<Skeleton>): Skeleton {
  return { ...emptySkeleton(), ...parts }
}

const ARCS = [arc("The Arrival"), arc("The Turn"), arc("The Reckoning")]

describe("placing on the Arcs", () => {
  it("places an Ending at the Arc its Earliest Arc names, ignoring case and Hidden markup", () => {
    const map = buildStoryMap(
      skeleton({
        arcs: [arc("The Arrival"), arc(hidden("The Turn")), arc("Last")],
        endings: [
          ending("A", "the turn"),
          ending("B", hidden("LAST")),
          ending("C", "  The Arrival "),
        ],
      })
    )
    expect(map.endings.map((e) => e.arc)).toEqual([1, 2, 0])
    expect(map.endings.every((e) => !e.blank && !e.unmatched)).toBe(true)
  })

  it("places a blank Earliest Arc at the first Arc", () => {
    const map = buildStoryMap(
      skeleton({ arcs: ARCS, endings: [ending("A", "  ")] })
    )
    expect(map.endings[0]).toMatchObject({
      arc: 0,
      blank: true,
      unmatched: false,
    })
  })

  it("places an Earliest Arc that names no Arc at the first Arc, marked unmatched", () => {
    const map = buildStoryMap(
      skeleton({
        arcs: ARCS,
        endings: [ending("A", "An Arc that is not there")],
        secrets: [secret("S", "Nowhere")],
        promises: [promise("P", "Nowhere")],
      })
    )
    for (const item of [map.endings[0], map.secrets[0], map.promises[0]]) {
      expect(item).toMatchObject({ arc: 0, blank: false, unmatched: true })
    }
  })

  it("matches the first of two Arcs with the same name", () => {
    const map = buildStoryMap(
      skeleton({
        arcs: [arc("Same"), arc("Same")],
        endings: [ending("A", "Same")],
      })
    )
    expect(map.endings[0].arc).toBe(0)
  })

  it("reads an Ending's Kind, or no Kind when it is not one of the three", () => {
    const map = buildStoryMap(
      skeleton({
        arcs: ARCS,
        endings: [
          ending("A", "", "Good"),
          ending("B", "", " bad "),
          ending("C", "", "neutral"),
          ending("D", "", "bittersweet"),
          ending("E", "", ""),
        ],
      })
    )
    expect(map.endings.map((e) => e.kind)).toEqual([
      "good",
      "bad",
      "neutral",
      "unset",
      "unset",
    ])
  })

  it("lists what forks off or sits at each Arc, and what can fire during it", () => {
    const map = buildStoryMap(
      skeleton({
        arcs: ARCS,
        endings: [
          ending("Early", ""),
          ending("Late", "The Reckoning"),
          ending("Mid", "The Turn"),
        ],
        secrets: [secret("S1", "The Turn"), secret("S2", "")],
        promises: [promise("P1", "The Turn")],
      })
    )
    expect(endingsFrom(map, 1).map((e) => e.index)).toEqual([2])
    expect(endingsDuring(map, 1).map((e) => e.index)).toEqual([0, 2])
    expect(endingsDuring(map, 2).map((e) => e.index)).toEqual([0, 1, 2])
    expect(secretsAt(map, 1).map((s) => s.index)).toEqual([0])
    expect(secretsAt(map, 0).map((s) => s.index)).toEqual([1])
    expect(promisesAt(map, 1).map((p) => p.index)).toEqual([0])
    expect(firesFrom(map.endings[1])).toBe("can fire from Arc 3 on")
  })
})

describe("the diagram's layout", () => {
  const map = buildStoryMap(
    skeleton({
      arcs: ARCS,
      endings: [
        ending("E0", "The Turn"),
        ending("E1", "The Turn"),
        ending("E2", "The Reckoning"),
        ending("E3", "Nowhere"),
      ],
      secrets: [
        secret("S0", "The Arrival"),
        secret("S1", "The Arrival"),
        secret("S2", "The Turn"),
      ],
      promises: [promise("P0", "The Arrival")],
    })
  )
  const lay = layout(map)

  it("runs the spine down, forks Endings right and puts markers left", () => {
    const arcs = lay.arcs
    expect(arcs[1].y).toBeGreaterThan(arcs[0].y)
    expect(arcs[2].y).toBeGreaterThan(arcs[1].y)
    expect(new Set(arcs.map((a) => a.x)).size).toBe(1)
    expect(lay.start.y + lay.start.h).toBeLessThan(arcs[0].y)

    const e0 = lay.rects.get(endingId(0))!
    const e1 = lay.rects.get(endingId(1))!
    expect(e0.x).toBeGreaterThan(arcs[1].x + arcs[1].w)
    expect(e1.x).toBeGreaterThan(e0.x + e0.w)
    expect(e0.y).toBe(e1.y)

    const s0 = lay.rects.get(secretId(0))!
    expect(s0.x + s0.w).toBeLessThan(arcs[0].x)
  })

  it("forks an Ending with an unknown Earliest Arc off the first Arc", () => {
    expect(lay.leaves[0]).toEqual([endingId(3)])
    expect(lay.leaves[1]).toEqual([endingId(0), endingId(1)])
    expect(lay.leaves[2]).toEqual([endingId(2)])
  })

  it("lists an Arc's Secrets before its Promises", () => {
    expect(lay.markers[0]).toEqual([secretId(0), secretId(1), promiseId(0)])
    expect(lay.markers[1]).toEqual([secretId(2)])
    expect(lay.markers[2]).toEqual([])
  })

  it("fits every node inside the diagram", () => {
    for (const rect of lay.rects.values()) {
      expect(rect.x).toBeGreaterThanOrEqual(0)
      expect(rect.y).toBeGreaterThanOrEqual(0)
      expect(rect.x + rect.w).toBeLessThanOrEqual(lay.width)
      expect(rect.y + rect.h).toBeLessThanOrEqual(lay.height)
    }
  })

  it("moves Up and Down along the spine", () => {
    expect(neighbor(lay, STORY_ID, "down")).toBe(arcId(0))
    expect(neighbor(lay, STORY_ID, "right")).toBeNull()
    expect(neighbor(lay, arcId(0), "up")).toBe(STORY_ID)
    expect(neighbor(lay, arcId(0), "down")).toBe(arcId(1))
    expect(neighbor(lay, arcId(2), "down")).toBeNull()
  })

  it("moves Right into an Arc's Endings and Left back to it", () => {
    expect(neighbor(lay, arcId(1), "right")).toBe(endingId(0))
    expect(neighbor(lay, endingId(0), "right")).toBe(endingId(1))
    expect(neighbor(lay, endingId(1), "right")).toBeNull()
    expect(neighbor(lay, endingId(1), "left")).toBe(endingId(0))
    expect(neighbor(lay, endingId(0), "left")).toBe(arcId(1))
  })

  it("moves Up and Down between rows of Endings, keeping the place in the row", () => {
    expect(neighbor(lay, endingId(1), "down")).toBe(endingId(2))
    expect(neighbor(lay, endingId(2), "up")).toBe(endingId(0))
    expect(neighbor(lay, endingId(0), "up")).toBe(endingId(3))
    expect(neighbor(lay, endingId(3), "up")).toBeNull()
  })

  it("moves Left from an Arc to its markers and through them", () => {
    expect(PER_COL).toBe(2)
    expect(neighbor(lay, arcId(0), "left")).toBe(secretId(0))
    expect(neighbor(lay, arcId(2), "left")).toBeNull()
    expect(neighbor(lay, secretId(0), "down")).toBe(secretId(1))
    expect(neighbor(lay, secretId(1), "up")).toBe(secretId(0))
    expect(neighbor(lay, secretId(0), "left")).toBe(promiseId(0))
    expect(neighbor(lay, promiseId(0), "right")).toBe(secretId(0))
    expect(neighbor(lay, secretId(0), "right")).toBe(arcId(0))
    // Past a column's end, on to the next Arc that has markers.
    expect(neighbor(lay, secretId(1), "down")).toBe(secretId(2))
    expect(neighbor(lay, promiseId(0), "down")).toBe(secretId(2))
    expect(neighbor(lay, secretId(2), "up")).toBe(secretId(1))
  })
})
