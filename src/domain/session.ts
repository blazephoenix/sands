/**
 * Sessions and Turns (CONTEXT.md). A Session plays a frozen copy of its
 * World's Skeleton, so editing the Skeleton never changes a Session already
 * under way. Turn 0 is the Opening, the one Turn without a Player input.
 * The Writer alone plays the story: it writes each Passage, offers the
 * Player choices, and names the listed Ending a Passage reached.
 */
import { z } from "zod"

import { ENDING_KINDS, skeletonSchema } from "./skeleton"

/**
 * The Ending a Session reached: one the Skeleton lists or, when the Skeleton
 * lets the Writer invent endings, one the Writer invented.
 */
export const reachedEndingSchema = z.object({
  name: z.string().min(1),
  kind: z.enum(ENDING_KINDS),
  invented: z.boolean(),
})
export type ReachedEnding = z.infer<typeof reachedEndingSchema>

/** What the harness pane shows for one Turn: exactly what the Writer was given and gave back. */
export const writerLogSchema = z.object({
  instructions: z.string(),
  prompt: z.string(),
  /** The Writer's reply as it arrived, before parsing. */
  rawOutput: z.string(),
  /** The model id the provider reported. */
  model: z.string(),
  inputTokens: z.number().int().min(0),
  outputTokens: z.number().int().min(0),
  latencyMs: z.number().int().min(0),
  /** What code did with the reply that the Passage doesn't show, such as an Ending it did not accept. */
  notes: z.array(z.string()),
})
export type WriterLog = z.infer<typeof writerLogSchema>

/** What the Player character knows about one character, as of a Turn. */
export const characterKnowledgeSchema = z.object({
  /** The character's name as the Skeleton gives it. */
  character: z.string().min(1),
  knows: z.string(),
})
export type CharacterKnowledge = z.infer<typeof characterKnowledgeSchema>

/** A word in a Passage a reader may not know, with its meaning in this story. */
export const glossaryTermSchema = z.object({
  term: z.string().min(1),
  definition: z.string().min(1),
})
export type GlossaryTerm = z.infer<typeof glossaryTermSchema>

export const turnSchema = z
  .object({
    id: z.string().min(1),
    sessionId: z.string().min(1),
    /** 0 is the Opening. */
    index: z.number().int().min(0),
    /** Null exactly for the Opening. */
    playerInput: z.string().nullable(),
    passage: z.string(),
    /** What the Player can do next; empty once the Session has ended. */
    choices: z.array(z.string()),
    /** The Ending this Passage reached, or null. */
    ending: reachedEndingSchema.nullable(),
    /** Everything the Player character knows about each character met, as of this Turn. */
    known: z.array(characterKnowledgeSchema),
    /** Words first defined in this Passage. */
    glossary: z.array(glossaryTermSchema),
    log: writerLogSchema,
    createdAt: z.iso.datetime(),
  })
  .refine((turn) => (turn.index === 0) === (turn.playerInput === null), {
    message: "Only the Opening has no Player input.",
    path: ["playerInput"],
  })
export type Turn = z.infer<typeof turnSchema>

export const sessionSchema = z.object({
  id: z.string().min(1),
  worldId: z.string().min(1),
  /** The World's Skeleton as it stood when the Session started. */
  skeleton: skeletonSchema,
  /** The Ending reached, or null while the Session is in play. */
  ending: reachedEndingSchema.nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})
export type Session = z.infer<typeof sessionSchema>
