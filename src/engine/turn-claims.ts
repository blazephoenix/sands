/**
 * Claims on playing a Session's next Turn.
 *
 * While one request plays a Session's Turn (the Opening included) it holds
 * the claim, so a second tab, a fast reload or a doubled effect gets 409
 * before any progress is streamed, instead of spending model calls on a Turn
 * that could never be saved. The claim is released however the stream ends;
 * nothing is saved before a Passage ships, so a released claim leaves the
 * Session as it was.
 *
 * The database's unique `(session_id, idx)` is the final guard: it refuses a
 * second Turn N even if two writers get past the claim (two server
 * processes, say).
 *
 * Claims live in this server process, on `globalThis`, so every route
 * handler's module graph shares them.
 */

declare global {
  var __sandsTurnClaims: Set<string> | undefined
}

function claims(): Set<string> {
  globalThis.__sandsTurnClaims ??= new Set()
  return globalThis.__sandsTurnClaims
}

/**
 * Claims the right to play a Session's next Turn. Returns the release, or
 * null when another request holds the claim.
 */
export function claimTurn(sessionId: string): (() => void) | null {
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
