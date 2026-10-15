import { describe, expect, it } from "vitest"

import { fromSegments, hidden, plainText, toSegments } from "./hidden-text"

describe("Hidden text", () => {
  it("splits a field into plain and Hidden runs and joins them back", () => {
    const value = `The butler ${hidden("did it")} at dawn.`
    const segments = toSegments(value)
    expect(segments).toEqual([
      { text: "The butler ", hidden: false },
      { text: "did it", hidden: true },
      { text: " at dawn.", hidden: false },
    ])
    expect(fromSegments(segments)).toBe(value)
  })

  it("hides the rest of a field after an unclosed tag, and drops a stray close", () => {
    expect(toSegments("a <hidden>b")).toEqual([
      { text: "a ", hidden: false },
      { text: "b", hidden: true },
    ])
    expect(toSegments("a </hidden>b")).toEqual([{ text: "a b", hidden: false }])
  })

  it("merges neighbouring runs and defuses literal tags typed as text", () => {
    expect(
      fromSegments([
        { text: "a", hidden: true },
        { text: "b", hidden: true },
        { text: "", hidden: false },
        { text: "<hidden>", hidden: false },
      ])
    ).toBe("<hidden>ab</hidden>‹hidden>")
  })

  it("reads the plain text of a field, Hidden runs included", () => {
    expect(plainText(`Ben ${hidden("Moss")}`)).toBe("Ben Moss")
  })
})
