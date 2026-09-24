/** A fresh id with a readable prefix, e.g. `w-1f3a9c2e`. */
export function newId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}

/** The current time as the ISO string the domain contracts carry. */
export function nowIso() {
  return new Date().toISOString()
}
