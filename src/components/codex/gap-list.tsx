"use client"

/**
 * A solvability result's Gaps as a list (spec §8 step 3, §7.2). A Gap that
 * names an Entry the surface can show jumps to it.
 */
import type { SolvabilityGap } from "@/domain/world"

export function GapList({
  gaps,
  canSelect,
  onSelect,
}: {
  gaps: readonly SolvabilityGap[]
  /** Whether the surface shows this Entry (removed or locked ones may be hidden). */
  canSelect: (entryId: string) => boolean
  onSelect: (entryId: string) => void
}) {
  return (
    <ul className="flex list-disc flex-col gap-1 pl-4">
      {gaps.map((gap) => (
        <li key={`${gap.code}-${gap.entryId}-${gap.arcIndex}-${gap.message}`}>
          {gap.entryId && canSelect(gap.entryId) ? (
            <button
              type="button"
              onClick={() => onSelect(gap.entryId!)}
              className="inline rounded-sm text-left underline underline-offset-3 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {gap.message}
            </button>
          ) : (
            gap.message
          )}
        </li>
      ))}
    </ul>
  )
}
