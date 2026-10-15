import type { Metadata } from "next"

import { StoryMapPage } from "./story-map-page"

export const metadata: Metadata = { title: "Story map" }

/**
 * `/worlds/[id]/map`: the Story map, the World's Skeleton drawn as its Arc
 * spine with the Endings forking off it. Loads through `GET /api/worlds/[id]`
 * on the client, like every page (no server actions).
 */
export default async function Page(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  return <StoryMapPage key={id} worldId={id} />
}
