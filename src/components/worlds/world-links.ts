/** Links between a World's pages. */

/** The World page: its Skeleton's state and its Sessions. */
export function worldHref(worldId: string) {
  return `/worlds/${encodeURIComponent(worldId)}`
}

export function skeletonHref(worldId: string) {
  return `/worlds/${encodeURIComponent(worldId)}/skeleton`
}

/** The Story map: the Skeleton's Arc spine with the Endings forking off it. */
export function storyMapHref(worldId: string) {
  return `/worlds/${encodeURIComponent(worldId)}/map`
}

export function sessionHref(sessionId: string) {
  return `/sessions/${encodeURIComponent(sessionId)}`
}
