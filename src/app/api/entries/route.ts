/**
 * POST /api/entries: store an Entry the Author added in the Entry editor
 * (source author, status accepted), in a World or in one Session's Codex.
 * Not in spec §5.2; added so the Entry surface's slash menu has a home.
 */
import { createEntryRequestSchema, type CreateEntryResponse } from "@/domain/api"
import { createEntry } from "@/fixtures/entries"
import { handle, readJson } from "@/server/http"
import { scenarioGate } from "@/server/scenarios"

export const POST = handle(async (request: Request) => {
  const blocked = await scenarioGate(request)
  if (blocked) return blocked
  const body = await readJson(request, createEntryRequestSchema)
  return Response.json(createEntry(body) satisfies CreateEntryResponse, { status: 201 })
})
