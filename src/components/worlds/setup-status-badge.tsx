import { CheckIcon, PencilLineIcon, SearchCheckIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import type { SetupStatus } from "@/domain/world"

export const SETUP_STATUS_LABELS: Record<SetupStatus, string> = {
  draft: "Draft",
  drafting: "Setup running",
  review: "In review",
  ready: "Ready to play",
}

/** A World's setup status (spec §6 `setup_status`) as a badge. */
export function SetupStatusBadge({ status }: { status: SetupStatus }) {
  switch (status) {
    case "draft":
      return (
        <Badge variant="outline">
          <PencilLineIcon data-icon="inline-start" aria-hidden />
          {SETUP_STATUS_LABELS.draft}
        </Badge>
      )
    case "drafting":
      return (
        <Badge variant="secondary">
          <Spinner data-icon="inline-start" className="motion-reduce:animate-none" aria-hidden />
          {SETUP_STATUS_LABELS.drafting}
        </Badge>
      )
    case "review":
      return (
        <Badge variant="secondary">
          <SearchCheckIcon data-icon="inline-start" aria-hidden />
          {SETUP_STATUS_LABELS.review}
        </Badge>
      )
    case "ready":
      return (
        <Badge>
          <CheckIcon data-icon="inline-start" aria-hidden />
          {SETUP_STATUS_LABELS.ready}
        </Badge>
      )
  }
}
