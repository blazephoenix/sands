/**
 * Ids for new rows, made in code rather than by the database: setup and the
 * Session copy need an Entry's id before it is stored, to point other Entries
 * at it.
 */

/** A fresh id with a readable prefix and a full random UUID, e.g. `w-1f3a9c2e-…`. */
export function newId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`
}
