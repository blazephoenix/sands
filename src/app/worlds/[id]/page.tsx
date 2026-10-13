import type { Metadata } from "next"

import { WorldPage } from "./world-page"

export const metadata: Metadata = { title: "World" }

/**
 * `/worlds/[id]`: a playable World's Sessions and New Session.
 * Loads through `GET /api/worlds/[id]` on the client, like every page
 * (no server actions); a World that is not ready is sent on to its Brief or
 * its setup review.
 */
export default async function Page(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  return <WorldPage key={id} worldId={id} />
}
