/**
 * Going back to the Worlds home after a World is deleted from its own page
 * (the World page or the Brief): a toast says what was deleted, and the home
 * focuses its list (or its Empty state) once it has loaded. Module state
 * survives the client-side navigation between the pages; a full reload drops
 * it, which is fine.
 */
import { toast } from "@/components/ui/toast"
import { worldDisplayName } from "@/domain/world"

let focusOnArrival = false

/** Confirms the delete and goes to the Worlds home, which then takes focus. */
export function returnHomeAfterDelete(
  router: { push: (href: string) => void },
  world: { name: string }
) {
  toast.add({
    title: `Deleted ${worldDisplayName(world.name)}`,
    type: "success",
  })
  focusOnArrival = true
  router.push("/")
}

/** True once after `returnHomeAfterDelete`; the Worlds home calls it when its list is ready. */
export function takeWorldsHomeFocusRequest() {
  const requested = focusOnArrival
  focusOnArrival = false
  return requested
}
