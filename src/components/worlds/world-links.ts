/**
 * Links between a World's pages. Dev scenarios (`?scenario=`) follow the Author
 * from page to page, so a forced state stays forced across a navigation.
 */
import type { SetupStatus } from "@/domain/world"
import { currentScenario } from "@/lib/api-client"

/** Appends the current page's `?scenario=` to an in-app href. Client only; a no-op on the server. */
export function withScenario(href: string) {
  const scenario = currentScenario()
  if (!scenario) return href
  return `${href}${href.includes("?") ? "&" : "?"}scenario=${encodeURIComponent(scenario)}`
}

export function briefHref(worldId: string) {
  return `/worlds/${encodeURIComponent(worldId)}/brief`
}

export function setupReviewHref(worldId: string) {
  return `/worlds/${encodeURIComponent(worldId)}/setup`
}

/** Where a World opens from the Worlds home: its Brief until setup has run, then the setup review. */
export function worldHref(world: { id: string; setupStatus: SetupStatus }) {
  return world.setupStatus === "draft" || world.setupStatus === "drafting" ? briefHref(world.id) : setupReviewHref(world.id)
}
