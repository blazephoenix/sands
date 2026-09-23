/**
 * POST /api/sessions: start a Session in a World, copying every non-rejected
 * World Entry into it (ADR-0005). 409 if the World is not set up or not
 * solvable.
 */
import { createSessionRequestSchema, type CreateSessionResponse } from "@/domain/api"
import { createSession } from "@/fixtures/sessions"
import { handle, readJson } from "@/server/http"
import { scenarioGate } from "@/server/scenarios"

export const POST = handle(async (request: Request) => {
  const blocked = await scenarioGate(request)
  if (blocked) return blocked
  const body = await readJson(request, createSessionRequestSchema)
  return Response.json(createSession(body) satisfies CreateSessionResponse, { status: 201 })
})
