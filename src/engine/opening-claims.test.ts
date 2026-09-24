import { describe, expect, it } from "vitest"

import { claimOpening } from "./opening-claims"

describe("claims on writing an Opening (ADR-0014)", () => {
  it("lets one request at a time write a Session's Opening", () => {
    const release = claimOpening("s-claims-1")
    expect(release).toBeTypeOf("function")
    expect(claimOpening("s-claims-1")).toBeNull()
    expect(claimOpening("s-claims-2")).toBeTypeOf("function")
    release!()
    expect(claimOpening("s-claims-1")).toBeTypeOf("function")
  })

  it("releases once, however often the release is called", () => {
    const first = claimOpening("s-claims-3")!
    first()
    const second = claimOpening("s-claims-3")!
    first()
    expect(claimOpening("s-claims-3")).toBeNull()
    second()
  })
})
