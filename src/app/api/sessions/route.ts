/**
 * POST /api/sessions: start a Session in a World, copying every non-rejected
 * World Entry into it (ADR-0005). 409 if the World is not set up or not
 * solvable.
 */
import {
  createSessionRequestSchema,
  type CreateSessionResponse,
} from "@/domain/api"
import { startSession } from "@/sessions/start-session"
import { getDb } from "@/db/client"
import { handle, readJson } from "@/server/http"

export const POST = handle(async (request: Request) => {
  const body = await readJson(request, createSessionRequestSchema)
  return Response.json(
    startSession(getDb(), body) satisfies CreateSessionResponse,
    { status: 201 }
  )
})
