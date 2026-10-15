/**
 * POST /api/sessions/[id]/turns: play one Turn with the Player's input. 201
 * with the Turn and the Session (ended, if the Turn reached an Ending); 409
 * when the Session has ended or another tab played this Turn first.
 */
import { getDb } from "@/db/client"
import { playTurnRequestSchema } from "@/domain/api"
import { playTurn } from "@/play/play"
import { serverWriter } from "@/play/writer"
import { handle, readJson } from "@/server/http"

type Context = { params: Promise<{ id: string }> }

export const POST = handle(async (request: Request, { params }: Context) => {
  const { id } = await params
  const body = await readJson(request, playTurnRequestSchema)
  const played = await playTurn(await getDb(), serverWriter(), id, body.input, {
    signal: request.signal,
  })
  return Response.json(played, { status: 201 })
})
