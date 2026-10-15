import type { Metadata } from "next"

import { Prototype } from "./prototype"

export const metadata: Metadata = { title: "Skeleton editor prototype" }

/** PROTOTYPE, throwaway (issue #36): `/prototype/skeleton-editor?variant=A&fixture=0`. */
export default async function Page(props: {
  searchParams: Promise<{ variant?: string; fixture?: string }>
}) {
  const { variant, fixture } = await props.searchParams
  return (
    <Prototype
      variant={
        (["A", "B", "C", "D"] as const).find((v) => v === variant) ?? "A"
      }
      fixture={Number(fixture ?? 0) || 0}
    />
  )
}
