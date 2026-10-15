/**
 * Every issue the editor shows for a Skeleton: `checkSkeleton`'s, plus the
 * places where its documents hold text the Writer won't read.
 */
import type { Skeleton } from "@/domain/skeleton"

import { checkSkeleton, type SkeletonIssue } from "./check"
import {
  documentToSkeleton,
  type DocumentNote,
  type SkeletonDocument,
} from "./document"

export function skeletonIssues(
  skeleton: Skeleton,
  notes: readonly DocumentNote[]
): SkeletonIssue[] {
  return [
    ...checkSkeleton(skeleton),
    ...notes.map((note) => ({ ...note, blocksPlay: false })),
  ]
}

/** The issues of a World as stored, read from its documents. */
export function documentIssues(document: SkeletonDocument): SkeletonIssue[] {
  const { skeleton, notes } = documentToSkeleton(document)
  return skeletonIssues(skeleton, notes)
}
