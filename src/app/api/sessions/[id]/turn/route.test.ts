import { describe, expect, it } from "vitest"

import { apiErrorBodySchema } from "@/domain/api"

import { POST as runSetup } from "../../../worlds/[id]/setup/route"
import { POST as playTurn } from "./route"

describe("the routes that call models, until the engine lands", () => {
  it("answer 501 not_built for a Turn, saying play is not built yet", async () => {
    const response = await playTurn()
    expect(response.status).toBe(501)
    expect(apiErrorBodySchema.parse(await response.json()).error).toEqual({
      code: "not_built",
      message: expect.stringMatching(/^Play is not built yet/),
    })
  })

  it("answer 501 not_built for setup, saying setup is not built yet", async () => {
    const response = await runSetup()
    expect(response.status).toBe(501)
    expect(apiErrorBodySchema.parse(await response.json()).error).toEqual({
      code: "not_built",
      message: expect.stringMatching(/^Setup is not built yet/),
    })
  })
})
