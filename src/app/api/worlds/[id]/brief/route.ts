/**
 * PUT /api/worlds/[id]/brief: autosave of the Brief document and the World's
 * name. The validated Brief is stored when the document passes §7.1, null
 * otherwise. 409 when the Brief is locked (setup has started).
 */
import { saveBriefRequestSchema, type SaveBriefResponse } from "@/domain/api"
import { saveBrief } from "@/fixtures/worlds"
import { handle, readJson } from "@/server/http"
import { scenarioGate } from "@/server/scenarios"

type Context = { params: Promise<{ id: string }> }

export const PUT = handle(async (request: Request, { params }: Context) => {
  const blocked = await scenarioGate(request)
  if (blocked) return blocked
  const { id } = await params
  const body = await readJson(request, saveBriefRequestSchema)
  return Response.json({
    world: saveBrief(id, body),
  } satisfies SaveBriefResponse)
})
