import type { Metadata } from "next"
import { BookOpenIcon } from "lucide-react"

import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

export const metadata: Metadata = { title: "Worlds" }

/** Placeholder landing. Ticket 02 replaces it with the Worlds home (GET /api/worlds). */
export default function HomePage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Worlds</h1>
        <p className="max-w-prose leading-relaxed text-muted-foreground">
          Write a Brief, review what setup drafts from it, and play Sessions in the World it becomes.
        </p>
      </div>
      <Empty className="flex-none border py-12">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BookOpenIcon />
          </EmptyMedia>
          <EmptyTitle>Your Worlds will be listed here</EmptyTitle>
          <EmptyDescription>This page is being built. Check back soon.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  )
}
