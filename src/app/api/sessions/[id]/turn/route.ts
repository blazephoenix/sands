/**
 * POST /api/sessions/[id]/turn: play one Turn (spec §9.1), or the Opening
 * with `input: null` (spec §9.0; ADR-0014). Streams NDJSON progress, then the
 * whole Turn; never prose (ADR-0003).
 *
 * 404 for an unknown Session, including one whose World was deleted (the
 * delete cascades to its Sessions). Nothing is written: `insertTurn` also
 * re-reads the Session inside its transaction, so a World deleted while a
 * Turn is in flight fails that Turn cleanly instead of saving it.
 *
 * Not built yet: past that check it answers 501 until the Turn engine lands
 * (#4). Nothing is changed, and no model is called.
 */
import { getDb } from "@/db/client"
import { getSession } from "@/db/sessions"
import { handle, HttpError } from "@/server/http"

type Context = { params: Promise<{ id: string }> }

export const POST = handle(async (_request: Request, { params }: Context) => {
  const { id } = await params
  getSession(getDb(), id)
  throw new HttpError(
    501,
    "not_built",
    "Play is not built yet, so this Session cannot be played. Its World and Codex are saved; come back once play lands."
  )
})
