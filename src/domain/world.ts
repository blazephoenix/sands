/**
 * Worlds (CONTEXT.md): a Skeleton the Author writes, in which Sessions are
 * played. For now a World is its Skeleton and nothing else. Its name is the
 * Skeleton's Title.
 */
import { z } from "zod"

import { skeletonDocumentSchema } from "@/skeleton/document"

import { skeletonSchema } from "./skeleton"

/** A World's name as the UI shows it: "Untitled World" when it has none. */
export function worldDisplayName(name: string) {
  return name || "Untitled World"
}

export const worldSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  /** The Skeleton editor's documents, so the editor reopens exactly as left. */
  document: skeletonDocumentSchema,
  /** The Skeleton read from the documents on their last save, however unfinished. */
  skeleton: skeletonSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})
export type World = z.infer<typeof worldSchema>
