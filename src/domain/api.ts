/**
 * The route contracts: what each route handler takes and returns. The client
 * (`src/lib/api-client.ts`) parses every response with these.
 */
import { z } from "zod"

import { sessionSchema, turnSchema } from "./session"
import { worldSchema } from "./world"

export const apiErrorBodySchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
})
export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>

/** One problem with a Skeleton (see `src/skeleton/check.ts`). */
export const skeletonIssueSchema = z.object({
  path: z.string(),
  message: z.string(),
  blocksPlay: z.boolean(),
})

/** A row of the Worlds home. */
export const worldSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  /** Whether a Session can start: the Skeleton has no issue that blocks play. */
  playable: z.boolean(),
  sessionCount: z.number().int().min(0),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})
export type WorldSummary = z.infer<typeof worldSummarySchema>

export const listWorldsResponseSchema = z.object({
  worlds: z.array(worldSummarySchema),
})

export const createWorldRequestSchema = z.object({
  name: z.string().max(200).optional(),
})
export type CreateWorldRequest = z.infer<typeof createWorldRequestSchema>

export const createWorldResponseSchema = z.object({ world: worldSchema })

/** A row of a World's Sessions. */
export const sessionSummarySchema = sessionSchema
  .pick({ id: true, ending: true, createdAt: true, updatedAt: true })
  .extend({
    /** Turns stored, the Opening included. */
    turnCount: z.number().int().min(0),
  })
export type SessionSummary = z.infer<typeof sessionSummarySchema>

export const getWorldResponseSchema = z.object({
  world: worldSchema,
  issues: z.array(skeletonIssueSchema),
  sessions: z.array(sessionSummarySchema),
})
export type GetWorldResponse = z.infer<typeof getWorldResponseSchema>

export const createSessionRequestSchema = z.object({
  worldId: z.string().min(1),
})
export type CreateSessionRequest = z.infer<typeof createSessionRequestSchema>

export const getSessionResponseSchema = z.object({
  session: sessionSchema,
  worldName: z.string(),
  turns: z.array(turnSchema),
})
export type GetSessionResponse = z.infer<typeof getSessionResponseSchema>

/** What the Player character does: a choice's words or the Player's own. */
export const playTurnRequestSchema = z.object({
  input: z.string().trim().min(1).max(2_000),
})
export type PlayTurnRequest = z.infer<typeof playTurnRequestSchema>

export const playTurnResponseSchema = z.object({
  session: sessionSchema,
  turn: turnSchema,
})
