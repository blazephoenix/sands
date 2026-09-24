/**
 * POST /api/sessions/[id]/turn: play one Turn (spec §9.1), or the Opening
 * with `input: null` (spec §9.0; ADR-0014). Streams NDJSON progress, then the
 * whole Turn; never prose (ADR-0003).
 *
 * Not built yet: answers 501 until the Turn engine lands (#4). Nothing is
 * read or changed, and no model is called.
 */
import { handle, HttpError } from "@/server/http"

export const POST = handle(async () => {
  throw new HttpError(
    501,
    "not_built",
    "Play is not built yet, so this Session cannot be played. Its World and Codex are saved; come back once play lands."
  )
})
