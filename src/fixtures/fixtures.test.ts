import { describe, expect, it } from "vitest"

import { skeletonSchema } from "@/domain/skeleton"
import { checkSkeleton } from "@/skeleton/check"

import { FIXTURES } from "."

describe.each(FIXTURES.map((f) => [f.story.title, f] as const))(
  "the fixture %s",
  (_, skeleton) => {
    it("is a Skeleton with no issues at all", () => {
      expect(skeletonSchema.parse(skeleton)).toEqual(skeleton)
      expect(checkSkeleton(skeleton)).toEqual([])
    })

    it("lists exactly three Endings, one of each Kind, and invents none", () => {
      expect(skeleton.endings.map((e) => e.kind).sort()).toEqual([
        "bad",
        "good",
        "neutral",
      ])
      expect(skeleton.writerMayInventEndings).toBe(false)
    })
  }
)
