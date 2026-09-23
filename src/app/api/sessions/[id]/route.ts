/**
 * GET /api/sessions/[id]: the story, current state, Codex and harness log
 * (spec §5.2). Finishes the latest Turn's background work first if it is due,
 * so polling this route is how the page sees background results land. The
 * `background-pending` scenario keeps it running.
 */
import type { GetSessionResponse } from "@/domain/session-view"
import { getSession, getSessionView, settleBackground } from "@/fixtures/sessions"
import { handle } from "@/server/http"
import { hasScenario, scenarioGate } from "@/server/scenarios"

type Context = { params: Promise<{ id: string }> }

export const GET = handle(async (request: Request, { params }: Context) => {
  const blocked = await scenarioGate(request)
  if (blocked) return blocked
  const { id } = await params
  getSession(id) // 404 before anything else
  if (!hasScenario(request, "background-pending")) settleBackground(id)
  return Response.json(getSessionView(id) satisfies GetSessionResponse, { headers: { "cache-control": "no-store" } })
})
