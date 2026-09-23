import type { Metadata } from "next"

import { SetupReviewPage } from "./setup-review-page"

export const metadata: Metadata = { title: "Setup review" }

/**
 * `/worlds/[id]/setup` (spec §11): the Author reviews what setup drafted,
 * watches solvability after every change, and starts a Session. The page
 * loads through `GET /api/worlds/[id]` on the client, like every page
 * (ADR-0010), so fixture scenarios apply to it.
 */
export default async function Page(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  return <SetupReviewPage worldId={id} />
}
