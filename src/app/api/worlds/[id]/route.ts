/**
 * GET /api/worlds/[id]: the World (with its Brief and stored solvability
 * result), its template Entries and its Sessions. Shared by every page.
 */
import type { GetWorldResponse } from "@/domain/api"
import { getDb } from "@/db/client"
import { listWorldEntries } from "@/db/entries"
import { listSessionSummaries } from "@/db/sessions"
import { getWorld } from "@/db/worlds"
import { handle } from "@/server/http"

type Context = { params: Promise<{ id: string }> }

export const GET = handle(async (_request: Request, { params }: Context) => {
  const { id } = await params
  const db = getDb()
  const world = getWorld(db, id)
  return Response.json({
    world,
    entries: listWorldEntries(db, world.id),
    sessions: listSessionSummaries(db, world.id),
  } satisfies GetWorldResponse)
})
