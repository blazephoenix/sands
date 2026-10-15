/** Links between a World's pages. */

/** The World page: its Skeleton's state and its Sessions. */
export function worldHref(worldId: string) {
  return `/worlds/${encodeURIComponent(worldId)}`
}

export function skeletonHref(worldId: string) {
  return `/worlds/${encodeURIComponent(worldId)}/skeleton`
}

export function sessionHref(sessionId: string) {
  return `/sessions/${encodeURIComponent(sessionId)}`
}
