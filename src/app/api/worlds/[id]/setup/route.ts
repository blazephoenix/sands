/**
 * POST /api/worlds/[id]/setup: runs setup (spec §8) and streams `SetupEvent`s
 * as NDJSON, ending in the World (now `review`) with its Entries, or an error
 * that leaves the World in `draft` with nothing stored.
 *
 * Answers before streaming when setup cannot start: 404 for an unknown World,
 * 409 when setup is running or has run, 422 when the saved Brief does not
 * pass, 503 when the models are not configured. The World moves to
 * `drafting` (locking the Brief) before the stream starts; leaving the page
 * aborts the request, which stops the run and returns the World to `draft`.
 */
import type { SetupEvent } from "@/domain/events"
import { getDb } from "@/db/client"
import { getWorld } from "@/db/worlds"
import { handle, HttpError } from "@/server/http"
import { ndjsonResponse } from "@/server/ndjson"
import { setupModels } from "@/setup/models"
import { claimSetup, runSetup } from "@/setup/run"

type Context = { params: Promise<{ id: string }> }

export const POST = handle(async (request: Request, { params }: Context) => {
  const { id } = await params
  const db = getDb()
  getWorld(db, id)
  let models
  try {
    models = setupModels()
  } catch (error) {
    console.error("[setup] models are not configured", error)
    throw new HttpError(
      503,
      "not_configured",
      `Setup cannot reach its models: ${error instanceof Error ? error.message : String(error)}`
    )
  }
  const world = claimSetup(db, id)
  return ndjsonResponse<SetupEvent>(
    (emit, elapsed, signal) =>
      runSetup({ db, ...models }, world, { emit, elapsed, signal }),
    { request }
  )
})
