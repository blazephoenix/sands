/**
 * GET /api/worlds/[id]: the World (with its Brief and stored solvability
 * result), its template Entries and its Sessions. Shared by every page.
 */
import type { GetWorldResponse } from "@/domain/api"
import { getWorld, listWorldEntries, sessionSummaries } from "@/fixtures/worlds"
import { handle } from "@/server/http"
import { scenarioGate } from "@/server/scenarios"

type Context = { params: Promise<{ id: string }> }

export const GET = handle(async (request: Request, { params }: Context) => {
  const blocked = await scenarioGate(request)
  if (blocked) return blocked
  const { id } = await params
  const world = getWorld(id)
  return Response.json({
    world,
    entries: listWorldEntries(world.id),
    sessions: sessionSummaries(world.id),
  } satisfies GetWorldResponse)
})
