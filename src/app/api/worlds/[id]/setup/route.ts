/**
 * POST /api/worlds/[id]/setup: runs setup (spec §8) and streams `SetupEvent`s
 * as NDJSON, ending in the World (now `review`) with its drafted Entries, or an
 * error that leaves the World in `draft`.
 *
 * Not built yet: answers 501 until the setup engine lands. Nothing is read or
 * changed, and no model is called.
 */
import { apiError } from "@/server/http"

export async function POST() {
  return apiError(
    501,
    "not_built",
    "Setup is not built yet, so this World cannot be set up."
  )
}
