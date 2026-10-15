/**
 * GET /api/worlds: every World, most recently updated first, with whether it
 * can be played and how many Sessions it has.
 *
 * POST /api/worlds: a new World with an empty Skeleton. 201.
 */
import { getDb } from "@/db/client"
import { listWorldsWithSessionCounts } from "@/db/worlds"
import type { WorldSummary } from "@/domain/api"
import { handle } from "@/server/http"
import { isPlayable } from "@/skeleton/check"
import { createWorld } from "@/worlds/worlds"

export const GET = handle(async () => {
  const rows = await listWorldsWithSessionCounts(await getDb())
  const worlds = rows.map(({ world, sessionCount }): WorldSummary => ({
    id: world.id,
    name: world.name,
    playable: isPlayable(world.skeleton),
    sessionCount,
    createdAt: world.createdAt,
    updatedAt: world.updatedAt,
  }))
  return Response.json({ worlds })
})

export const POST = handle(async () => {
  const world = await createWorld(await getDb())
  return Response.json({ world }, { status: 201 })
})
