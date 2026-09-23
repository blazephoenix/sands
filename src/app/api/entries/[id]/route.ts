/**
 * PATCH /api/entries/[id]: accept, reject, restore, edit or mark-seen one
 * Entry, a World template Entry or a Session copy alike. Locked Entries answer
 * 409. A change to a World template Entry re-runs the solvability check and
 * stores the result on the World; the response carries it (spec §8 step 4).
 */
import { patchEntryRequestSchema, type PatchEntryResponse } from "@/domain/api"
import { patchEntry } from "@/fixtures/entries"
import { handle, readJson } from "@/server/http"
import { scenarioGate } from "@/server/scenarios"

type Context = { params: Promise<{ id: string }> }

export const PATCH = handle(async (request: Request, { params }: Context) => {
  const blocked = await scenarioGate(request)
  if (blocked) return blocked
  const { id } = await params
  const body = await readJson(request, patchEntryRequestSchema)
  return Response.json(patchEntry(id, body) satisfies PatchEntryResponse)
})
