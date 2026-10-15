/**
 * The Writer (CONTEXT.md): the model that writes the story. One `write` is
 * one Passage, with the choices offered next and the Ending it reached, if
 * any. The caller owns the instructions and the prompt (`src/play/`), so a
 * test can read exactly what the Writer was given.
 */
import { z } from "zod"

import { ENDING_KINDS } from "@/domain/skeleton"

export interface WriterRequest {
  /** The system instructions. */
  readonly instructions: string
  readonly prompt: string
}

/** What the Writer answers. Strict-schema friendly: no optional fields, `null` instead. */
export const writerOutputSchema = z.object({
  passage: z.string().describe("The next Passage, as plain prose."),
  choices: z
    .array(z.string())
    .describe(
      "Two to four things the Player character could do next. Empty once the story has ended."
    ),
  ending: z
    .object({
      name: z.string().describe("The Ending's name, exactly as listed."),
      kind: z.enum(ENDING_KINDS),
    })
    .nullable()
    .describe("The Ending this Passage concludes the story on, or null."),
  characterNotes: z
    .array(
      z.object({
        character: z.string().describe("The name exactly as in the Skeleton."),
        knows: z.string(),
      })
    )
    .describe(
      "For each character the Player character met or learned something new about in this Passage: everything they now know about that character."
    ),
  glossary: z
    .array(z.object({ term: z.string(), definition: z.string() }))
    .describe(
      "Words in this Passage a reader today may not know, each with a short definition."
    ),
})
export type WriterOutput = z.infer<typeof writerOutputSchema>

export interface WriterResult {
  readonly output: WriterOutput
  /** The reply as it arrived, before parsing, for the harness pane. */
  readonly rawOutput: string
  /** The model id that served the call, as the provider reported it. */
  readonly model: string
  readonly usage: {
    readonly inputTokens: number
    readonly outputTokens: number
  }
  /** Wall-clock time of the call, including any retries. */
  readonly latencyMs: number
}

export interface Writer {
  write(
    request: WriterRequest,
    options?: { signal?: AbortSignal }
  ): Promise<WriterResult>
}

/** A Writer call that could not be made, or came back unusable. */
export class WriterError extends Error {
  override readonly name = "WriterError"
}
