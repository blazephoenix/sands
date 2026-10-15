import { describe, expect, it } from "vitest"

import { deleteWorldCopy } from "./delete-world-copy"

describe("the delete-World confirmation", () => {
  it("names the World and counts its Sessions", () => {
    expect(
      deleteWorldCopy({ name: "The Long Night", sessionCount: 3 })
    ).toEqual({
      title: "Delete “The Long Night”?",
      description:
        "This deletes the World and its Skeleton and its 3 Sessions. This cannot be undone.",
    })
  })

  it("says Session for one, and leaves Sessions out when there are none", () => {
    expect(deleteWorldCopy({ name: "A", sessionCount: 1 }).description).toMatch(
      /its 1 Session\./
    )
    expect(deleteWorldCopy({ name: "A", sessionCount: 0 }).description).toBe(
      "This deletes the World and its Skeleton. This cannot be undone."
    )
  })

  it("calls a World with no name Untitled World", () => {
    expect(deleteWorldCopy({ name: "", sessionCount: 0 }).title).toBe(
      "Delete Untitled World?"
    )
  })
})
