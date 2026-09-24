import { describe, expect, it } from "vitest"

import { deleteWorldCopy } from "./delete-world-copy"

describe("the delete-World confirmation", () => {
  it("names the World and counts its Sessions", () => {
    expect(
      deleteWorldCopy({ name: "The Long Night", sessionCount: 3 })
    ).toEqual({
      title: "Delete “The Long Night”?",
      description:
        "This deletes the World, its Brief, its 3 Sessions and every Entry. This cannot be undone.",
    })
  })

  it("says Session for one, and leaves Sessions out when there are none", () => {
    expect(deleteWorldCopy({ name: "A", sessionCount: 1 }).description).toMatch(
      /^This deletes the World, its Brief, its 1 Session and every Entry\./
    )
    expect(deleteWorldCopy({ name: "A", sessionCount: 0 }).description).toMatch(
      /^This deletes the World, its Brief and every Entry\./
    )
  })

  it("calls a World with no name Untitled World", () => {
    expect(deleteWorldCopy({ name: "", sessionCount: 0 }).title).toBe(
      "Delete Untitled World?"
    )
  })
})
