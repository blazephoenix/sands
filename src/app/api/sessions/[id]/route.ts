/**
 * GET /api/sessions/[id]: the Session, its World's name and every Turn,
 * Opening first.
 */
import { getDb } from "@/db/client"
import { getSession, listTurns } from "@/db/sessions"
import { findWorld } from "@/db/worlds"
import type { GetSessionResponse } from "@/domain/api"
import { handle } from "@/server/http"

type Context = { params: Promise<{ id: string }> }

export const GET = handle(async (_request: Request, { params }: Context) => {
  const { id } = await params
  const db = await getDb()
  const session = await getSession(db, id)
  const [world, turns] = await Promise.all([
    findWorld(db, session.worldId),
    listTurns(db, session.id),
  ])
  return Response.json({
    session,
    worldName: world?.name ?? "",
    turns,
  } satisfies GetSessionResponse)
})
