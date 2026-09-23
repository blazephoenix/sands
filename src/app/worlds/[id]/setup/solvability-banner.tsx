"use client"

/**
 * The solvability banner above the Entry card (spec §8 steps 3-4): a pass, or
 * the exact gaps. A gap that names an Entry in the review selects it.
 */
import { CircleCheckIcon, CircleXIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { SolvabilityResult } from "@/domain/world"

export function SolvabilityBanner({
  solvability,
  canSelect,
  onSelect,
}: {
  solvability: SolvabilityResult | null
  /** Whether an Entry is in the review list (locked Entries are not). */
  canSelect: (entryId: string) => boolean
  onSelect: (entryId: string) => void
}) {
  if (!solvability) return null
  if (solvability.passed) {
    return (
      <Alert>
        <CircleCheckIcon aria-hidden />
        <AlertTitle>This World is solvable</AlertTitle>
        <AlertDescription>
          Every Clue the Decisive actions need can be found, and every Arc has
          an Exit condition.
        </AlertDescription>
      </Alert>
    )
  }
  return (
    <Alert variant="destructive">
      <CircleXIcon aria-hidden />
      <AlertTitle>This World can&apos;t be solved yet</AlertTitle>
      <AlertDescription>
        <ul className="flex list-disc flex-col gap-1 pl-4">
          {solvability.gaps.map((gap) => (
            <li
              key={`${gap.code}-${gap.entryId}-${gap.arcIndex}-${gap.message}`}
            >
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
      </AlertDescription>
    </Alert>
  )
}
