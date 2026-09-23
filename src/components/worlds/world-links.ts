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

/** The World page: a playable World's Sessions. For any other World it sends the Author on to `worldHref`. */
export function worldPageHref(worldId: string) {
  return `/worlds/${encodeURIComponent(worldId)}`
}

export function sessionHref(sessionId: string) {
  return `/sessions/${encodeURIComponent(sessionId)}`
}

/**
 * Where a World opens: its Brief until setup has run, the setup review while
 * the Author reviews, and the World page, with its Sessions, once it is ready.
 */
export function worldHref(world: { id: string; setupStatus: SetupStatus }) {
  switch (world.setupStatus) {
    case "draft":
    case "drafting":
      return briefHref(world.id)
    case "review":
      return setupReviewHref(world.id)
    case "ready":
      return worldPageHref(world.id)
  }
}
