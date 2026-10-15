/**
 * POST /api/sessions: start a Session in a World. The Writer writes the
 * Opening before anything is stored. 201 with the Session and its Opening;
 * 409 while the World's Skeleton has issues that block play.
 */
import { getDb } from "@/db/client"
import { createSessionRequestSchema } from "@/domain/api"
import { startSession } from "@/play/play"
import { serverWriter } from "@/play/writer"
import { handle, readJson } from "@/server/http"

export const POST = handle(async (request: Request) => {
  const body = await readJson(request, createSessionRequestSchema)
  const started = await startSession(
    await getDb(),
    serverWriter(),
    body.worldId,
    { signal: request.signal }
  )
  return Response.json(started, { status: 201 })
})
