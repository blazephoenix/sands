"use client"

/**
 * The setup review's left sidebar: progress, then the drafted Entries grouped
 * Needs a look / To review / Approved / Removed, then a note on the Author's
 * own locked Entries. Click a row, or use ↑ / ↓ anywhere on the page, to select.
 */
import * as React from "react"
import {
  CheckIcon,
  CircleIcon,
  FlagIcon,
  LockIcon,
  PencilIcon,
  XIcon,
} from "lucide-react"

import { ENTRY_KIND_ICONS } from "@/components/codex/entry-badges"
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress"
import { ENTRY_KIND_LABELS, type Entry } from "@/domain/entry"
import { cn } from "@/lib/utils"
import {
  isFlagged,
  reviewDecision,
  type ReviewProgress,
  type ReviewSections,
} from "@/setup/review"

import { entryTitle } from "./use-setup-review"

export const REVIEW_ROW_ATTR = "data-review-row"

const SECTIONS = [
  { key: "needsALook", title: "Needs a look" },
  { key: "toReview", title: "To review" },
  { key: "approved", title: "Approved" },
  { key: "removed", title: "Removed" },
] as const satisfies readonly { key: keyof ReviewSections; title: string }[]

/** The status icon and its spoken word, in the review's vocabulary. */
export function decisionLook(entry: Pick<Entry, "status">) {
  if (entry.status === "edited")
    return { Icon: PencilIcon, label: "Edited", className: "text-foreground" }
  switch (reviewDecision(entry.status)) {
    case "approved":
      return {
        Icon: CheckIcon,
        label: "Approved",
        className: "text-foreground",
      }
    case "removed":
      return { Icon: XIcon, label: "Removed", className: "text-destructive" }
    case "undecided":
      return {
        Icon: CircleIcon,
        label: "Not reviewed",
        className: "text-muted-foreground",
      }
    default:
      return {
        Icon: LockIcon,
        label: "Locked",
        className: "text-muted-foreground",
      }
  }
}

export function ReviewSidebar({
  sections,
  progress,
  selectedId,
  onSelect,
}: {
  sections: ReviewSections
  progress: ReviewProgress
  selectedId: string | null
  onSelect: (entryId: string) => void
}) {
  const percent =
    progress.total === 0
      ? 100
      : Math.round((progress.reviewed / progress.total) * 100)
  return (
    <nav aria-label="Drafted Entries" className="flex flex-col gap-5 p-3">
      <Progress
        value={percent}
        className="gap-2 px-2"
        getAriaValueText={() =>
          `${progress.reviewed} of ${progress.total} reviewed`
        }
      >
        <ProgressLabel className="text-xs font-normal text-muted-foreground">
          {progress.reviewed} of {progress.total} reviewed
        </ProgressLabel>
        <ProgressValue className="text-xs text-muted-foreground">
          {() => `${progress.approved} approved · ${progress.removed} removed`}
        </ProgressValue>
      </Progress>

      {SECTIONS.map(({ key, title }) => {
        const rows = sections[key]
        if (rows.length === 0) return null
        const headingId = `review-section-${key}`
        return (
          <section
            key={key}
            aria-labelledby={headingId}
            className="flex flex-col gap-0.5"
          >
            <h2
              id={headingId}
              className="px-2 pb-1 text-xs font-medium text-muted-foreground"
            >
              {title} · {rows.length}
            </h2>
            <ul className="flex flex-col gap-0.5">
              {rows.map((entry) => (
                <li key={entry.id}>
                  <ReviewRow
                    entry={entry}
                    selected={entry.id === selectedId}
                    onSelect={onSelect}
                  />
                </li>
              ))}
            </ul>
          </section>
        )
      })}

      {sections.locked.length > 0 ? (
        <p className="flex gap-1.5 px-2 text-xs leading-relaxed text-muted-foreground">
          <LockIcon aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          <span>
            {sections.locked.length}{" "}
            {sections.locked.length === 1 ? "Entry comes" : "Entries come"} from
            your Brief. They&apos;re locked and need no review.
          </span>
        </p>
      ) : null}
    </nav>
  )
}

function ReviewRow({
  entry,
  selected,
  onSelect,
}: {
  entry: Entry
  selected: boolean
  onSelect: (entryId: string) => void
}) {
  const status = decisionLook(entry)
  const KindIcon = ENTRY_KIND_ICONS[entry.kind]
  const removed = entry.status === "rejected"
  const flagged = isFlagged(entry)
  return (
    <button
      type="button"
      {...{ [REVIEW_ROW_ATTR]: entry.id }}
      aria-current={selected ? "true" : undefined}
      aria-label={`${entryTitle(entry)}, ${ENTRY_KIND_LABELS[entry.kind].singular}, ${status.label}${flagged ? ", Judge flag" : ""}`}
      onClick={() => onSelect(entry.id)}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
        selected && "bg-muted font-medium",
        removed && "text-muted-foreground line-through"
      )}
    >
      <status.Icon
        aria-hidden
        className={cn("size-4 shrink-0", status.className)}
      />
      <KindIcon
        aria-hidden
        className="size-3.5 shrink-0 text-muted-foreground"
      />
      <span className="min-w-0 flex-1 truncate">{entryTitle(entry)}</span>
      {flagged ? (
        <FlagIcon
          aria-hidden
          className="size-3.5 shrink-0 text-muted-foreground"
        />
      ) : null}
    </button>
  )
}
