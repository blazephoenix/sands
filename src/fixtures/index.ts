/**
 * Test Worlds: three Skeletons for playtesting the Writer, each with exactly
 * three listed Endings (one good, one bad, one neutral). Seed them with
 * `pnpm seed:fixtures`. They are fixtures, not stories Sands ships: never a
 * reason for a decision or a name.
 */
import type { Skeleton } from "@/domain/skeleton"

import { fantasyQuest } from "./fantasy-quest"
import { murderMystery } from "./murder-mystery"
import { survivalCrisis } from "./survival-crisis"

export const FIXTURES: readonly Skeleton[] = [
  fantasyQuest,
  murderMystery,
  survivalCrisis,
]
