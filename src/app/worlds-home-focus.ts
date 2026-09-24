/**
 * Hands focus from the World page to the Worlds home after the World is
 * deleted there: the home focuses its list (or its Empty state) once it has
 * loaded. Module state survives the client-side navigation between the two
 * pages; a full reload drops it, which is fine.
 */
let focusOnArrival = false

/** Called by the World page just before it navigates home. */
export function requestWorldsHomeFocus() {
  focusOnArrival = true
}

/** True once after `requestWorldsHomeFocus`; the Worlds home calls it when its list is ready. */
export function takeWorldsHomeFocusRequest() {
  const requested = focusOnArrival
  focusOnArrival = false
  return requested
}
