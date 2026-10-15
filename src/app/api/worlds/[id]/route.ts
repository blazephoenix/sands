/**
 * GET /api/worlds/[id]: the World with its Skeleton, the Skeleton's issues
 * and the World's Sessions, newest first.
 *
 * DELETE /api/worlds/[id]: deletes the World for good, with its Sessions and
 * their Turns. 204 with no body; 404 for an unknown World.
 */
import { getDb } from "@/db/client"
import { listSessionSummaries } from "@/db/sessions"
import { getWorld } from "@/db/worlds"
import type { GetWorldResponse } from "@/domain/api"
import { handle } from "@/server/http"
import { checkSkeleton } from "@/skeleton/check"
import { deleteWorld } from "@/worlds/worlds"

type Context = { params: Promise<{ id: string }> }

export const GET = handle(async (_request: Request, { params }: Context) => {
  const { id } = await params
  const db = await getDb()
  const world = await getWorld(db, id)
  const sessions = await listSessionSummaries(db, world.id)
  return Response.json({
    world,
    issues: checkSkeleton(world.skeleton),
    sessions: sessions.map(({ session, turnCount }) => ({
      id: session.id,
      ending: session.ending,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      turnCount,
    })),
  } satisfies GetWorldResponse)
})

export const DELETE = handle(async (_request: Request, { params }: Context) => {
  const { id } = await params
  await deleteWorld(await getDb(), id)
  return new Response(null, { status: 204 })
})
