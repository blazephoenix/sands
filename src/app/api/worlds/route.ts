/**
 * GET /api/worlds: the Worlds home list (not in spec §5.2).
 *
 * POST /api/worlds: create a World in `draft` from a Brief document, or from
 * the new-Brief template when none is given (spec §7.1).
 */
import {
  createWorldRequestSchema,
  type CreateWorldResponse,
  type ListWorldsResponse,
} from "@/domain/api"
import { getDb } from "@/db/client"
import { createWorld, listWorldSummaries } from "@/db/worlds"
import { handle, readJson } from "@/server/http"

/** Read the database on every request; never prerender the list at build. */
export const dynamic = "force-dynamic"

export const GET = handle(async () => {
  return Response.json({
    worlds: listWorldSummaries(getDb()),
  } satisfies ListWorldsResponse)
})

export const POST = handle(async (request: Request) => {
  const body = await readJson(request, createWorldRequestSchema)
  return Response.json(
    { world: createWorld(getDb(), body) } satisfies CreateWorldResponse,
    { status: 201 }
  )
})
