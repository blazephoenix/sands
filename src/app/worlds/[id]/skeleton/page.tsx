import { Suspense } from "react"
import type { Metadata } from "next"

import { SkeletonPage } from "./skeleton-page"

export const metadata: Metadata = { title: "Skeleton" }

/**
 * `/worlds/[id]/skeleton?section=characters&row=…`: the Skeleton editor.
 * Loads through `GET /api/worlds/[id]` and autosaves through
 * `PUT /api/worlds/[id]/skeleton`, like every page (no server actions).
 */
export default async function Page(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  // The editor reads its section from the URL's search params.
  return (
    <Suspense>
      <SkeletonPage key={id} worldId={id} />
    </Suspense>
  )
}
