import { describe, expect, it } from "vitest"

import { claimTurn } from "./turn-claims"

describe("claims on playing a Turn", () => {
  it("lets one request at a time play a Session's Turn", () => {
    const release = claimTurn("s-claims-1")
    expect(release).toBeTypeOf("function")
    expect(claimTurn("s-claims-1")).toBeNull()
    expect(claimTurn("s-claims-2")).toBeTypeOf("function")
    release!()
    expect(claimTurn("s-claims-1")).toBeTypeOf("function")
  })

  it("releases once, however often the release is called", () => {
    const first = claimTurn("s-claims-3")!
    first()
    const second = claimTurn("s-claims-3")!
    first()
    expect(claimTurn("s-claims-3")).toBeNull()
    second()
  })
})
