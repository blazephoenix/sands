/**
 * PUT /api/worlds/[id]/brief: autosave of the Brief document and the World's
 * name. The validated Brief is stored when the document passes §7.1, null
 * otherwise. 409 when the Brief is locked (setup has started).
 */
import { saveBriefRequestSchema, type SaveBriefResponse } from "@/domain/api"
import { getDb } from "@/db/client"
import { saveBrief } from "@/worlds/worlds"
import { handle, readJson } from "@/server/http"

type Context = { params: Promise<{ id: string }> }

export const PUT = handle(async (request: Request, { params }: Context) => {
  const { id } = await params
  const body = await readJson(request, saveBriefRequestSchema)
  return Response.json({
    world: saveBrief(getDb(), id, body),
  } satisfies SaveBriefResponse)
})
