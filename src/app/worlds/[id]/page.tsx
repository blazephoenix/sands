import type { Metadata } from "next"

import { WorldPage } from "./world-page"

export const metadata: Metadata = { title: "World" }

/**
 * `/worlds/[id]`: a World's Sessions, New Session and Edit Skeleton.
 * Loads through `GET /api/worlds/[id]` on the client, like every page
 * (no server actions).
 */
export default async function Page(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  return <WorldPage key={id} worldId={id} />
}
