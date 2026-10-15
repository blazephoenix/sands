/**
 * The Story map's model, read from a Skeleton: the Arc spine, the Endings
 * that fork off it at their Earliest Arc, and the Secrets and Promises
 * attached to the Arc where they may first surface or pay off.
 *
 * An Earliest Arc is matched to an Arc by name (plain text, ignoring case).
 * Blank means "from the first Arc"; a name that matches no Arc is placed at
 * the first Arc and flagged `unmatched` (the Skeleton check already reports
 * it as an issue that blocks play).
 */
import {
  ENDING_KINDS,
  type Agenda,
  type Arc,
  type Ending,
  type EndingKind,
  type Secret,
  type Skeleton,
  type SkeletonPromise,
  type StateFlag,
} from "@/domain/skeleton"
import { plainText } from "@/skeleton/hidden-text"

export type NodeId =
  | "story"
  | `arc:${number}`
  | `ending:${number}`
  | `secret:${number}`
  | `promise:${number}`
  | `agenda:${number}:${number}`
  | `flag:${number}`

export const STORY_ID: NodeId = "story"
export const arcId = (i: number): NodeId => `arc:${i}`
export const endingId = (i: number): NodeId => `ending:${i}`
export const secretId = (i: number): NodeId => `secret:${i}`
export const promiseId = (i: number): NodeId => `promise:${i}`
export const agendaId = (arc: number, i: number): NodeId => `agenda:${arc}:${i}`
export const flagId = (i: number): NodeId => `flag:${i}`

/** Where an Earliest Arc points: an Arc index, and whether the name matched one. */
export type Placement = {
  /** The Arc it attaches to; the first Arc when the name is blank or matches none. */
  arc: number
  /** Blank: it may happen from the first Arc. */
  blank: boolean
  /** Named an Arc the Skeleton does not have. */
  unmatched: boolean
}

export type KindKey = EndingKind | "unset"

export type MapArc = { index: number; arc: Arc }
export type MapEnding = Placement & {
  index: number
  ending: Ending
  kind: KindKey
}
export type MapSecret = Placement & { index: number; secret: Secret }
export type MapPromise = Placement & { index: number; promise: SkeletonPromise }
export type MapFlag = { index: number; flag: StateFlag }

export type StoryMap = {
  skeleton: Skeleton
  arcs: MapArc[]
  endings: MapEnding[]
  secrets: MapSecret[]
  promises: MapPromise[]
  flags: MapFlag[]
}

function nameKey(value: string) {
  return plainText(value).trim().toLowerCase()
}

function placer(arcs: Arc[]) {
  const byName = new Map<string, number>()
  arcs.forEach((arc, index) => {
    const key = nameKey(arc.name)
    if (key && !byName.has(key)) byName.set(key, index)
  })
  return (earliestArc: string): Placement => {
    const key = nameKey(earliestArc)
    if (!key) return { arc: 0, blank: true, unmatched: false }
    const found = byName.get(key)
    return found === undefined
      ? { arc: 0, blank: false, unmatched: true }
      : { arc: found, blank: false, unmatched: false }
  }
}

function kindOf(kind: string): KindKey {
  const key = plainText(kind).trim().toLowerCase()
  return (ENDING_KINDS as readonly string[]).includes(key)
    ? (key as EndingKind)
    : "unset"
}

export function buildStoryMap(skeleton: Skeleton): StoryMap {
  const place = placer(skeleton.arcs)
  return {
    skeleton,
    arcs: skeleton.arcs.map((arc, index) => ({ index, arc })),
    endings: skeleton.endings.map((ending, index) => ({
      index,
      ending,
      kind: kindOf(ending.kind),
      ...place(ending.earliestArc),
    })),
    secrets: skeleton.secrets.map((secret, index) => ({
      index,
      secret,
      ...place(secret.earliestArc),
    })),
    promises: skeleton.promises.map((promise, index) => ({
      index,
      promise,
      ...place(promise.earliestArc),
    })),
    flags: skeleton.stateFlags.map((flag, index) => ({ index, flag })),
  }
}

/** Endings that fork off the spine at this Arc. */
export function endingsFrom(map: StoryMap, arc: number) {
  return map.endings.filter((e) => e.arc === arc)
}

/** Endings that can fire during this Arc: those whose Earliest Arc is this one or earlier. */
export function endingsDuring(map: StoryMap, arc: number) {
  return map.endings.filter((e) => e.arc <= arc)
}

export function secretsAt(map: StoryMap, arc: number) {
  return map.secrets.filter((s) => s.arc === arc)
}

export function promisesAt(map: StoryMap, arc: number) {
  return map.promises.filter((p) => p.arc === arc)
}

export type ResolvedNode =
  | { type: "story" }
  | { type: "arc"; item: MapArc }
  | { type: "ending"; item: MapEnding }
  | { type: "secret"; item: MapSecret }
  | { type: "promise"; item: MapPromise }
  | { type: "agenda"; arc: MapArc; index: number; agenda: Agenda }
  | { type: "flag"; item: MapFlag }

/** The node an id names, or null when the Skeleton no longer has it. */
export function resolveNode(map: StoryMap, id: NodeId): ResolvedNode | null {
  if (id === "story") return { type: "story" }
  const [type, a, b] = id.split(":")
  const i = Number(a)
  switch (type) {
    case "arc": {
      const item = map.arcs[i]
      return item ? { type: "arc", item } : null
    }
    case "ending": {
      const item = map.endings[i]
      return item ? { type: "ending", item } : null
    }
    case "secret": {
      const item = map.secrets[i]
      return item ? { type: "secret", item } : null
    }
    case "promise": {
      const item = map.promises[i]
      return item ? { type: "promise", item } : null
    }
    case "agenda": {
      const arc = map.arcs[i]
      const agenda = arc?.arc.agendas[Number(b)]
      return arc && agenda
        ? { type: "agenda", arc, index: Number(b), agenda }
        : null
    }
    case "flag": {
      const item = map.flags[i]
      return item ? { type: "flag", item } : null
    }
    default:
      return null
  }
}

/** A one-line plain label for a node: for aria labels and compact rows. */
export function nodeLabel(map: StoryMap, id: NodeId): string {
  const node = resolveNode(map, id)
  if (!node) return ""
  const or = (value: string, fallback: string) =>
    plainText(value).trim() || fallback
  switch (node.type) {
    case "story":
      return or(map.skeleton.story.title, "Untitled story")
    case "arc":
      return or(node.item.arc.name, `Arc ${node.item.index + 1}`)
    case "ending":
      return or(node.item.ending.name, `Ending ${node.item.index + 1}`)
    case "secret":
      return or(node.item.secret.secret, `Secret ${node.item.index + 1}`)
    case "promise":
      return or(node.item.promise.promise, `Promise ${node.item.index + 1}`)
    case "agenda":
      return or(node.agenda.character, `Agenda ${node.index + 1}`)
    case "flag":
      return or(node.item.flag.flag, `State flag ${node.item.index + 1}`)
  }
}

/** "can fire from Arc 2 on": when an Ending may first fire. */
export function firesFrom(ending: MapEnding) {
  return `can fire from Arc ${ending.arc + 1} on`
}

export const KIND_LABEL: Record<KindKey, string> = {
  good: "Good",
  bad: "Bad",
  neutral: "Neutral",
  unset: "No Kind",
}
