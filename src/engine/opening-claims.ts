/**
 * Claims on writing a Session's Opening (ADR-0014).
 *
 * While one request writes a Session's Opening it holds the claim, so a
 * second tab, a fast reload or a doubled effect gets 409 before any progress
 * is streamed instead of writing an Opening alongside it. The claim is
 * released however the stream ends; nothing is saved before a Passage ships,
 * so a released claim leaves the Session as it was.
 *
 * The claim covers the wait while the Opening is written. The database's
 * unique `(session_id, idx)` is the final guard: it refuses a second Turn 0
 * even if two writers get past the claim (two server processes, say).
 *
 * Claims live in this server process, on `globalThis`, so every route
 * handler's module graph shares them.
 */

declare global {
  var __sandsOpeningClaims: Set<string> | undefined
}

function claims(): Set<string> {
  globalThis.__sandsOpeningClaims ??= new Set()
  return globalThis.__sandsOpeningClaims
}

/**
 * Claims the right to write a Session's Opening. Returns the release, or null
 * when another request holds the claim. The caller checks first that the
 * Session exists and has no Turns.
 */
export function claimOpening(sessionId: string): (() => void) | null {
  const held = claims()
  if (held.has(sessionId)) return null
  held.add(sessionId)
  let released = false
  return () => {
    if (released) return
    released = true
    held.delete(sessionId)
  }
}
