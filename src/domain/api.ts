/**
 * Request and response bodies of the route handlers (spec §5.2; ADR-0010).
 * The client parses every response with these, so a contract drift fails
 * loudly at the boundary. Streaming routes use `./events.ts`.
 */
import { z } from "zod"

import { entryContentSchema, entrySchema, entryStatusSchema } from "./entry"
import { endingSchema, sessionSchema } from "./session"
import {
  setupStatusSchema,
  solvabilityResultSchema,
  worldSchema,
} from "./world"

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
  /** Every Turn, the Opening included; `playerTurnCount` gives the Turns the Player played. */
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

/** One row of the Worlds home. */
export const worldSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  setupStatus: setupStatusSchema,
  sessionCount: z.number().int().min(0),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})
export type WorldSummary = z.infer<typeof worldSummarySchema>

/**
 * GET /api/worlds: every World, most recently updated first. Not in spec §5.2;
 * added for the Worlds home.
 */
export const listWorldsResponseSchema = z.object({
  worlds: z.array(worldSummarySchema),
})
export type ListWorldsResponse = z.infer<typeof listWorldsResponseSchema>

/**
 * POST /api/worlds: create a World in `draft`. With no `briefDoc`, the Brief
 * starts as the new-Brief template (spec §7.1).
 */
export const createWorldRequestSchema = z.object({
  name: z.string().trim().max(200).default(""),
  briefDoc: z.array(z.unknown()).optional(),
})
export type CreateWorldRequest = z.input<typeof createWorldRequestSchema>

export const createWorldResponseSchema = z.object({ world: worldSchema })
export type CreateWorldResponse = z.infer<typeof createWorldResponseSchema>

/**
 * PUT /api/worlds/[id]/brief: autosave. Sends the whole Brief document and/or
 * the World's name. The server converts the document and stores the validated
 * Brief when it passes §7.1 (null otherwise). The Brief is locked once setup
 * has started: a `briefDoc` for a World past `draft` answers 409. The name can
 * change at any time.
 */
export const saveBriefRequestSchema = z
  .object({
    name: z.string().trim().max(200).optional(),
    briefDoc: z.array(z.unknown()).optional(),
  })
  .refine((body) => body.name !== undefined || body.briefDoc !== undefined, {
    message: "Send a name, a Brief document, or both.",
  })
export type SaveBriefRequest = z.input<typeof saveBriefRequestSchema>

export const saveBriefResponseSchema = z.object({ world: worldSchema })
export type SaveBriefResponse = z.infer<typeof saveBriefResponseSchema>

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
  z.object({
    action: z.literal("restore"),
    status: entryStatusSchema.exclude(["locked", "rejected"]),
  }),
  z.object({ action: z.literal("edit"), content: entryContentSchema }),
  z.object({ action: z.literal("mark-seen") }),
])
export type PatchEntryRequest = z.infer<typeof patchEntryRequestSchema>

/**
 * `solvability` is the World's latest result after the change: for a World
 * template Entry, re-checked (`src/setup/solvability.ts`) and stored on the
 * World, so `GET /api/worlds/[id]` returns the same result; `mark-seen`
 * returns the stored result unchanged, and so does a World not yet past
 * setup (null before setup). For a Session copy, whose edits take effect from
 * the next Turn: the Session's result, checked from where the Player stands
 * (spec §7.2), which the Codex pane shows as a warning.
 *
 * 409 when removing the Location the Player stands in.
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

/**
 * POST /api/sessions/[id]/turn: the Player's input, or `null` to play the
 * Opening (spec §9.0), mirroring the Turn's `playerInput`. The response is an
 * NDJSON stream of `TurnEvent`s.
 *
 * 409 when the request does not fit the Session: an Opening for a Session
 * that already has Turns (or whose Opening is being written right now), or a
 * Player input for a Session that has not had its Opening yet.
 */
export const turnRequestSchema = z.object({
  input: z
    .string()
    .trim()
    .min(1, "Type an action before sending.")
    .nullable(),
})
export type TurnRequest = z.infer<typeof turnRequestSchema>
