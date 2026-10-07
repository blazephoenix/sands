import { describe, expect, it } from "vitest"

import { passageParagraphs } from "./passage"

describe("passageParagraphs", () => {
  it("splits on blank lines and on single line breaks", () => {
    expect(
      passageParagraphs("The door opened.\n\n“Who's there?”\nNo answer.")
    ).toEqual(["The door opened.", "“Who's there?”", "No answer."])
  })

  it("drops empty and whitespace-only lines and trims each paragraph", () => {
    expect(passageParagraphs("\n  One.  \n \n\nTwo.\n")).toEqual([
      "One.",
      "Two.",
    ])
  })

  it("keeps a Passage without line breaks as one paragraph", () => {
    expect(passageParagraphs("A single block of prose.")).toEqual([
      "A single block of prose.",
    ])
  })
})
