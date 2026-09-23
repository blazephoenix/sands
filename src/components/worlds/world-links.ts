/**
 * Links between a World's pages. Dev scenarios (`?scenario=`) follow the Author
 * from page to page, so a forced state stays forced across a navigation.
 */
import type { SetupStatus } from "@/domain/world"
import { SCENARIO_QUERY } from "@/fixtures/scenarios"
import { currentScenario } from "@/lib/api-client"

/** Carries the current page's `?scenario=` onto an in-app href (replacing any it has). Client only; a no-op on the server. */
export function withScenario(href: string) {
  const scenario = currentScenario()
  if (!scenario) return href
  const url = new URL(href, "http://sands.local")
  url.searchParams.set(SCENARIO_QUERY, scenario)
  return `${url.pathname}${url.search}${url.hash}`
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
