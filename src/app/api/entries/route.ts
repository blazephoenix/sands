/**
 * POST /api/entries: store an Entry the Author added in the Entry editor
 * (source author, status accepted), in a World or in one Session's Codex.
 * Not in spec §5.2; added so the Entry surface's slash menu has a home.
 */
import {
  createEntryRequestSchema,
  type CreateEntryResponse,
} from "@/domain/api"
import { createEntry } from "@/codex/entries"
import { getDb } from "@/db/client"
import { handle, readJson } from "@/server/http"

export const POST = handle(async (request: Request) => {
  const body = await readJson(request, createEntryRequestSchema)
  return Response.json(
    createEntry(getDb(), body) satisfies CreateEntryResponse,
    { status: 201 }
  )
})
