/**
 * PATCH /api/entries/[id]: accept, reject, restore, edit or mark-seen one
 * Entry, a World template Entry or a Session copy alike. Locked Entries answer
 * 409. A change to a World template Entry re-runs the solvability check and
 * stores the result on the World; the response carries it (spec §8 step 4).
 */
import { patchEntryRequestSchema, type PatchEntryResponse } from "@/domain/api"
import { patchEntry } from "@/codex/entries"
import { getDb } from "@/db/client"
import { handle, readJson } from "@/server/http"

type Context = { params: Promise<{ id: string }> }

export const PATCH = handle(async (request: Request, { params }: Context) => {
  const { id } = await params
  const body = await readJson(request, patchEntryRequestSchema)
  return Response.json(
    patchEntry(getDb(), id, body) satisfies PatchEntryResponse
  )
})
