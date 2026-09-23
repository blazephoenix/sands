/**
 * GET /api/worlds: the Worlds home list (not in spec §5.2; added by ticket 02).
 * The `empty` scenario answers with no Worlds.
 *
 * POST /api/worlds: create a World in `draft` from a Brief document, or from
 * the new-Brief template when none is given (spec §7.1).
 */
import {
  createWorldRequestSchema,
  type CreateWorldResponse,
  type ListWorldsResponse,
} from "@/domain/api"
import { createWorld, worldSummaries } from "@/fixtures/worlds"
import { handle, readJson } from "@/server/http"
import { hasScenario, scenarioGate } from "@/server/scenarios"

export const GET = handle(async (request: Request) => {
  const blocked = await scenarioGate(request)
  if (blocked) return blocked
  const worlds = hasScenario(request, "empty") ? [] : worldSummaries()
  return Response.json({ worlds } satisfies ListWorldsResponse)
})

export const POST = handle(async (request: Request) => {
  const blocked = await scenarioGate(request)
  if (blocked) return blocked
  const body = await readJson(request, createWorldRequestSchema)
  return Response.json({ world: createWorld(body) } satisfies CreateWorldResponse, { status: 201 })
})
