/**
 * PUT /api/worlds/[id]/skeleton: the Skeleton editor's autosave. Stores the
 * documents whole, reads the Skeleton and the World's name from them, and
 * answers with every issue the Skeleton now has.
 */
import { getDb } from "@/db/client"
import {
  saveSkeletonRequestSchema,
  type SaveSkeletonResponse,
} from "@/domain/api"
import { handle, readJson } from "@/server/http"
import { skeletonIssues } from "@/skeleton/issues"
import { saveSkeleton } from "@/worlds/worlds"

type Context = { params: Promise<{ id: string }> }

export const PUT = handle(async (request: Request, { params }: Context) => {
  const { id } = await params
  const body = await readJson(request, saveSkeletonRequestSchema)
  const { world, notes } = await saveSkeleton(await getDb(), id, body.document)
  return Response.json({
    world,
    issues: skeletonIssues(world.skeleton, notes),
  } satisfies SaveSkeletonResponse)
})
