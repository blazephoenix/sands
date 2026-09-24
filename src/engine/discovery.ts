/**
 * Applying Discovery (spec §9.1 step 6; CONTEXT.md: Discovery): the Judge's
 * answers on whether the shipped Draft revealed each Allowed reveal and each
 * Discoverable Clue, turned into state by code. Pure.
 *
 * - Revealed Knowledge is recorded under its character. Knowledge that
 *   carries a Clue also finds that Clue, as the solvability check assumes.
 * - A found Clue that some live Decisive action requires gives the recovery.
 * - An answer at p >= 0.5 counts as revealed, the Rules' fail threshold.
 */
import { isLiveEntry, type Entry } from "@/domain/entry"
import type { Discovery, PlayerState } from "@/domain/session"

import { ENGINE_CONFIG } from "./config"

export type DiscoveryAnswer = Omit<Discovery, "revealed" | "reputationDelta">

export function applyDiscovery(
  before: PlayerState,
  entries: readonly Entry[],
  answers: readonly DiscoveryAnswer[]
): { state: PlayerState; discovery: Discovery[] } {
  const byId = new Map(entries.map((entry) => [entry.id, entry]))
  const required = new Set(
    entries.flatMap((entry) =>
      entry.kind === "decisive_action" && isLiveEntry(entry)
        ? entry.data.requires
        : []
    )
  )
  const cluesFound = [...before.cluesFound]
  const knowledgeRevealed = Object.fromEntries(
    Object.entries(before.knowledgeRevealed).map(([id, list]) => [
      id,
      [...list],
    ])
  )
  let reputation = before.reputation

  /** Finds a Clue; returns the recovery it earns. */
  const find = (clueId: string) => {
    if (cluesFound.includes(clueId)) return 0
    cluesFound.push(clueId)
    return required.has(clueId) ? ENGINE_CONFIG.recovery : 0
  }

  const discovery = answers.map((answer): Discovery => {
    const revealed = answer.probability >= ENGINE_CONFIG.ruleFailAt
    let reputationDelta = 0
    if (revealed) {
      const entry = byId.get(answer.target.entryId)
      if (answer.target.kind === "clue") {
        reputationDelta = find(answer.target.entryId)
      } else if (entry?.kind === "knowledge") {
        const holder = entry.data.characterId
        const list = (knowledgeRevealed[holder] ??= [])
        if (!list.includes(entry.id)) list.push(entry.id)
        if (entry.data.clueId) reputationDelta = find(entry.data.clueId)
      }
    }
    reputation += reputationDelta
    return { ...answer, revealed, reputationDelta }
  })

  const [low, high] = ENGINE_CONFIG.reputationRange
  return {
    state: {
      ...before,
      cluesFound,
      knowledgeRevealed,
      reputation: Math.min(high, Math.max(low, reputation)),
    },
    discovery,
  }
}
