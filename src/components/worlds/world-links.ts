/** Links between a World's pages. */
import type { SetupStatus } from "@/domain/world"

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
