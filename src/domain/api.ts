/**
 * Request and response bodies of the route handlers (spec §5.2; ADR-0010).
 * The client parses every response with these, so a contract drift fails
 * loudly at the boundary. Streaming routes use `./events.ts`.
 */
import { z } from "zod"

import { entryContentSchema, entrySchema, entryStatusSchema } from "./entry"
import { endingSchema, sessionSchema } from "./session"
import { solvabilityResultSchema, worldSchema } from "./world"

/** Every non-2xx JSON response. `message` states the cause and the next step. */
export const apiErrorBodySchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
})
export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>

export const sessionSummarySchema = z.object({
  id: z.string(),
  ending: endingSchema,
  turnCount: z.number().int().min(0),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})
export type SessionSummary = z.infer<typeof sessionSummarySchema>

/** GET /api/worlds/[id]: the World (with its Brief and stored solvability), its template Entries and its Sessions. */
export const getWorldResponseSchema = z.object({
  world: worldSchema,
  entries: z.array(entrySchema),
  sessions: z.array(sessionSummarySchema),
})
export type GetWorldResponse = z.infer<typeof getWorldResponseSchema>

/**
 * PATCH /api/entries/[id]: accept, edit or reject an Entry, a World template
 * Entry or a Session copy alike. Locked Entries answer 409.
 *
 * - `accept` -> accepted; `reject` -> rejected.
 * - `restore` puts back an earlier status (Undo of an accept or a reject).
 * - `edit` replaces the Author-editable content and sets `edited`.
 * - `mark-seen` records that the Author has seen a play-invented Entry.
 */
export const patchEntryRequestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("accept") }),
  z.object({ action: z.literal("reject") }),
  z.object({ action: z.literal("restore"), status: entryStatusSchema.exclude(["locked", "rejected"]) }),
  z.object({ action: z.literal("edit"), content: entryContentSchema }),
  z.object({ action: z.literal("mark-seen") }),
])
export type PatchEntryRequest = z.infer<typeof patchEntryRequestSchema>

/**
 * `solvability` is the World's latest result after the change: recomputed for
 * World template Entries (ticket 03 makes the recomputation real), null for
 * Session copies, whose edits take effect from the next Turn.
 */
export const patchEntryResponseSchema = z.object({
  entry: entrySchema,
  solvability: solvabilityResultSchema.nullable(),
})
export type PatchEntryResponse = z.infer<typeof patchEntryResponseSchema>

/** POST /api/entries: an Entry the Author added in the Entry editor (source `author`, status `accepted`). */
export const createEntryRequestSchema = z.object({
  worldId: z.string().min(1),
  /** Null for a World template Entry; a Session id to add it to that Session's Codex only. */
  sessionId: z.string().min(1).nullable(),
  content: entryContentSchema,
})
export type CreateEntryRequest = z.infer<typeof createEntryRequestSchema>
export const createEntryResponseSchema = patchEntryResponseSchema
export type CreateEntryResponse = PatchEntryResponse

/** POST /api/sessions: start a Session, copying every non-rejected World Entry into it (ADR-0005). */
export const createSessionRequestSchema = z.object({
  worldId: z.string().min(1),
  mode: z.enum(["harness", "baseline"]).default("harness"),
})
export type CreateSessionRequest = z.input<typeof createSessionRequestSchema>

export const createSessionResponseSchema = z.object({
  session: sessionSchema,
  /** The Session's copies of its World's Entries. */
  entries: z.array(entrySchema),
})
export type CreateSessionResponse = z.infer<typeof createSessionResponseSchema>

/** POST /api/sessions/[id]/turn: the Player's input. The response is an NDJSON stream of `TurnEvent`s. */
export const turnRequestSchema = z.object({
  input: z.string().trim().min(1, "Type what Jacob does before sending."),
})
export type TurnRequest = z.infer<typeof turnRequestSchema>
