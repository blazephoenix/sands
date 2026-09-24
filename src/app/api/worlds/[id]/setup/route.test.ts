import { describe, expect, it } from "vitest"

import { apiErrorBodySchema } from "@/domain/api"

import { POST as runSetup } from "./route"

describe("the setup route, until the setup engine lands", () => {
  it("answers 501 not_built, saying setup is not built yet and what to do", async () => {
    const response = await runSetup()
    expect(response.status).toBe(501)
    expect(apiErrorBodySchema.parse(await response.json()).error).toEqual({
      code: "not_built",
      message: expect.stringMatching(/^Setup is not built yet.+Keep editing/),
    })
  })
})
