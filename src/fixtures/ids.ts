/**
 * Fixture ids and clock, with no imports, so every area module can use them at
 * load time without an import cycle through the store.
 */

export const WORLD_IDS = {
  ready: "w-merchant-killings",
  review: "w-whitechapel",
  drafting: "w-thames-ledger",
  draft: "w-fog",
} as const

export const SESSION_IDS = {
  midPlay: "s-midplay",
  win: "s-win",
  death: "s-death",
  removed: "s-removed",
} as const

export const FIXTURE_EPOCH = "2026-09-21T09:00:00.000Z"

/** A fixed timestamp `minutes` after the fixture epoch. */
export function fixtureTime(minutes: number) {
  return new Date(Date.parse(FIXTURE_EPOCH) + minutes * 60_000).toISOString()
}

/** The id of a Session's copy of a World Entry. */
export function copyId(sessionId: string, templateId: string) {
  return `${sessionId}.${templateId}`
}
