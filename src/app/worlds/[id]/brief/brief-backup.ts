/**
 * A copy of unsaved Brief edits in this browser, so a reload or a closed tab
 * during a server outage loses nothing. Written while edits are unsaved,
 * removed once the server has them, and offered back when the Brief reopens
 * with a copy newer than the server's.
 *
 * Browser storage can be missing or full; every access is best effort.
 */

export type BriefBackup = {
  name: string
  briefDoc: unknown[]
  /** When the copy was taken (ms since epoch). */
  at: number
}

const key = (worldId: string) => `sands:brief-backup:${worldId}`

export function readBriefBackup(worldId: string): BriefBackup | null {
  try {
    const raw = window.localStorage.getItem(key(worldId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<BriefBackup>
    if (typeof parsed.name !== "string" || !Array.isArray(parsed.briefDoc) || typeof parsed.at !== "number") return null
    return parsed as BriefBackup
  } catch {
    return null
  }
}

export function writeBriefBackup(worldId: string, backup: BriefBackup) {
  try {
    window.localStorage.setItem(key(worldId), JSON.stringify(backup))
  } catch {
    // Storage full or blocked: the server save is still the source of truth.
  }
}

export function clearBriefBackup(worldId: string) {
  try {
    window.localStorage.removeItem(key(worldId))
  } catch {
    // Nothing to clear.
  }
}
