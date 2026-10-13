/**
 * POST /api/sessions/[id]/turn: play one Turn (spec §9.1), or the Opening
 * with `input: null` (spec §9.0). Streams NDJSON progress, then the
 * whole Turn; never prose, since the Player sees only judged Passages.
 *
 * Answers before streaming when the Turn cannot start:
 * - 404 for an unknown Session, including one whose World was deleted (the
 *   delete cascades to its Sessions). `insertTurn` also re-reads the Session
 *   inside its transaction, so a World deleted mid-Turn fails that Turn
 *   cleanly instead of saving it.
 * - 409 when the request does not fit the Session: it has ended, an Opening
 *   for a Session that has Turns, a Player input for one that has none, or
 *   another request is playing its Turn right now (the claim).
 * - 503 when the models are not configured.
 *
 * The shipped Turn's Background work (spec §9.2) outlives the response. The
 * next Turn waits for it through `backgroundWorkFor`; `after()` holds it only
 * to keep it alive on a host that stops work once the response is sent
 * (research §5).
 */
import { after } from "next/server"

import { getDb } from "@/db/client"
import { countTurns, getSession } from "@/db/sessions"
import { turnRequestSchema } from "@/domain/api"
import type { TurnEvent } from "@/domain/events"
import { backgroundWorkFor } from "@/engine/background"
import { turnModels } from "@/engine/models"
import { runTurn } from "@/engine/turn"
import { claimTurn } from "@/engine/turn-claims"
import { handle, HttpError, readJson } from "@/server/http"
import { ndjsonResponse } from "@/server/ndjson"

type Context = { params: Promise<{ id: string }> }

export const POST = handle(async (request: Request, { params }: Context) => {
  const { id } = await params
  const db = getDb()
  const session = getSession(db, id)
  const { input } = await readJson(request, turnRequestSchema)

  if (session.ending !== "none")
    throw new HttpError(
      409,
      "conflict",
      "This Session has ended. Start a new Session from its World to play again."
    )
  const played = countTurns(db, id)
  if (input === null && played > 0)
    throw new HttpError(
      409,
      "conflict",
      "This Session has already had its Opening. Reload the page to see it."
    )
  if (input !== null && played === 0)
    throw new HttpError(
      409,
      "conflict",
      "This Session's Opening has not been written yet. Reload the page to play it first."
    )

  let models
  try {
    models = turnModels()
  } catch (error) {
    console.error("[turn] models are not configured", error)
    throw new HttpError(
      503,
      "not_configured",
      `Play cannot reach its models: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  const release = claimTurn(id)
  if (!release)
    throw new HttpError(
      409,
      "conflict",
      input === null
        ? "This Session's Opening is being written in another tab or request. Wait for it, then reload."
        : "A Turn is already being played in this Session. Wait for it to finish."
    )
  let streamEnded = () => {}
  const streamed = new Promise<void>((resolve) => (streamEnded = resolve))
  after(async () => {
    await streamed
    await backgroundWorkFor(id)
  })
  try {
    return ndjsonResponse<TurnEvent>(
      async (emit, elapsed, signal) => {
        try {
          await runTurn(
            { db, ...models },
            { sessionId: id, input },
            { emit, elapsed, signal }
          )
        } finally {
          release()
          streamEnded()
        }
      },
      { request }
    )
  } catch (error) {
    release()
    streamEnded()
    throw error
  }
})
