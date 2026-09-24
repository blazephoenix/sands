/**
 * Worlds (CONTEXT.md; spec §6 `worlds`): a Brief plus everything setup derived
 * from it and the Author reviewed.
 */
import { z } from "zod"

import { briefSchema } from "./brief"

export const setupStatusSchema = z.enum([
  "draft",
  "drafting",
  "review",
  "ready",
])
export type SetupStatus = z.infer<typeof setupStatusSchema>

/** Setup has started, so the Brief is locked (spec §6 `brief_json`). */
export function isBriefLocked(world: { setupStatus: SetupStatus }) {
  return world.setupStatus !== "draft"
}

/** Setup has finished: the World has a Codex to review, check and play. */
export function hasFinishedSetup(world: { setupStatus: SetupStatus }) {
  return world.setupStatus === "review" || world.setupStatus === "ready"
}

/** One reason a World is not solvable, in words the Author can act on (spec §8 step 3). */
export const solvabilityGapSchema = z.object({
  code: z.enum([
    "missing_clue",
    "red_herring_required",
    "unreachable_clue",
    "clue_revealed_too_late",
    "arc_without_exit_condition",
  ]),
  message: z.string(),
  /** The Entry to jump to (a Clue, a Decisive action), or null for an Arc problem. */
  entryId: z.string().nullable(),
  /** The Arc at fault, for `arc_without_exit_condition`. */
  arcIndex: z.number().int().min(0).nullable(),
})
export type SolvabilityGap = z.infer<typeof solvabilityGapSchema>

export const solvabilityResultSchema = z.object({
  passed: z.boolean(),
  gaps: z.array(solvabilityGapSchema),
  checkedAt: z.iso.datetime(),
})
export type SolvabilityResult = z.infer<typeof solvabilityResultSchema>

export const worldSchema = z
  .object({
    id: z.string().min(1),
    name: z.string(),
    /** The Brief editor's BlockNote document, so the editor reopens exactly as left. Validated by conversion, not here. */
    briefDoc: z.array(z.unknown()),
    /** The validated Brief; null until the Brief first passes the §7.1 rules. Locked once setup starts. */
    brief: briefSchema.nullable(),
    setupStatus: setupStatusSchema,
    /** Latest solvability result; null before setup has produced Entries. */
    solvability: solvabilityResultSchema.nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .superRefine((world, ctx) => {
    if (world.setupStatus !== "draft" && world.brief === null) {
      ctx.addIssue({
        code: "custom",
        message: "A World past draft needs a validated Brief.",
        path: ["brief"],
      })
    }
  })
export type World = z.infer<typeof worldSchema>
