"use client"

/**
 * The solvability banner above the Entry card (spec §8 steps 3-4): a pass, or
 * the exact gaps. A gap that names an Entry in the review selects it.
 */
import { CircleCheckIcon, CircleXIcon } from "lucide-react"

import { GapList } from "@/components/codex/gap-list"
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
        <GapList
          gaps={solvability.gaps}
          canSelect={canSelect}
          onSelect={onSelect}
        />
      </AlertDescription>
    </Alert>
  )
}
