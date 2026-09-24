import { describe, expect, it } from "vitest"

import { apiErrorBodySchema } from "@/domain/api"

import { POST as playTurn } from "./route"

describe("the Turn route, until the Turn engine lands", () => {
  it("answers 501 not_built, saying play is not built yet and what to do", async () => {
    const response = await playTurn()
    expect(response.status).toBe(501)
    expect(apiErrorBodySchema.parse(await response.json()).error).toEqual({
      code: "not_built",
      message: expect.stringMatching(/^Play is not built yet.+come back/),
    })
  })
})
