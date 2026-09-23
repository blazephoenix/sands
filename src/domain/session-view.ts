/**
 * GET /api/sessions/[id] (spec §5.2): the story, the current state, the
 * Session's Codex and the harness log, in one response. Kept beside
 * `./api.ts` rather than in it so the Session page's contract has one home.
 */
import { z } from "zod"

import { entrySchema } from "./entry"
import { sessionSchema, turnSchema } from "./session"
import { worldSchema } from "./world"

export const getSessionResponseSchema = z.object({
  session: sessionSchema,
  /** 1-based position among its World's Sessions, oldest first: "Session 3". */
  sessionNumber: z.number().int().min(1),
  /** The World it is played in, for its name, Arcs and Player character. */
  world: worldSchema,
  /** Every Turn, oldest first. Each carries its Passage, its log and the Player state after it. */
  turns: z.array(turnSchema),
  /** This Session's copies of its World's Entries, plus Entries invented in play (rejected ones included). */
  entries: z.array(entrySchema),
})
export type GetSessionResponse = z.infer<typeof getSessionResponseSchema>
