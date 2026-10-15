import { afterEach, describe, expect, it, vi } from "vitest"

import { api, ApiError } from "./api-client"

describe("deleting a World", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function answer(response: Response | Error) {
    const fetch = vi.fn(async () => {
      if (response instanceof Error) throw response
      return response
    })
    vi.stubGlobal("fetch", fetch)
    return fetch
  }

  it("sends DELETE for the World and resolves on 204, which has no body", async () => {
    const fetch = answer(new Response(null, { status: 204 }))
    await expect(api.deleteWorld("w 1")).resolves.toBeUndefined()
    expect(fetch).toHaveBeenCalledWith(
      "/api/worlds/w%201",
      expect.objectContaining({ method: "DELETE" })
    )
  })

  it("rejects with the route's reason when it refuses, which is not worth a Retry", async () => {
    answer(
      Response.json(
        { error: { code: "conflict", message: "Not now." } },
        { status: 409 }
      )
    )
    const error = await api.deleteWorld("w").catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 409,
      code: "conflict",
      message: "Not now.",
      retryable: false,
    })
  })

  it("rejects with a retryable network error when the server cannot be reached", async () => {
    answer(new TypeError("Failed to fetch"))
    await expect(api.deleteWorld("w")).rejects.toMatchObject({
      code: "network",
      retryable: true,
    })
  })
})
