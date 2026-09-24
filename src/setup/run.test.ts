import { describe, expect, it } from "vitest"

import { londonBrief } from "@/test/london"

import { parseSummary, setupConflict } from "./run"

describe("setup run rules", () => {
  it("lets only a draft World run setup", () => {
    expect(setupConflict({ setupStatus: "draft" })).toBeNull()
    expect(setupConflict({ setupStatus: "drafting" })).toMatch(
      /already running/
    )
    expect(setupConflict({ setupStatus: "review" })).toMatch(/already run/)
    expect(setupConflict({ setupStatus: "ready" })).toMatch(/already run/)
  })

  it("describes the parsed Brief from the Brief itself", () => {
    expect(parseSummary(londonBrief("p").brief)).toBe(
      "7 Characters, 1 Location, 3 Arcs, 1 Ending"
    )
  })
})
