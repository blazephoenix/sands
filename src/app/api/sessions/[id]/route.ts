/**
 * GET /api/sessions/[id]: the story, current state, Codex and harness log
 * (spec §5.2). The Session page polls it while the latest Turn's background
 * work is pending, and sees the results once they are merged into that Turn.
 */
import type { GetSessionResponse } from "@/domain/session-view"
import { getDb } from "@/db/client"
import { getSessionView } from "@/sessions/session-view"
import { handle } from "@/server/http"

type Context = { params: Promise<{ id: string }> }

export const GET = handle(async (_request: Request, { params }: Context) => {
  const { id } = await params
  return Response.json(
    getSessionView(getDb(), id) satisfies GetSessionResponse,
    {
      headers: { "cache-control": "no-store" },
    }
  )
})
