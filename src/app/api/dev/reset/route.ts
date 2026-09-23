/**
 * POST /api/dev/reset: re-seeds the fixture store (dev only). The store keeps
 * mutations across requests and hot reloads; this puts every World, Entry and
 * Session back to its fixture state.
 */
import { resetStore } from "@/fixtures/store"
import { scenariosEnabled } from "@/fixtures/scenarios"
import { apiError } from "@/server/http"

export async function POST() {
  if (!scenariosEnabled())
    return apiError(404, "not_found", "Not available in production.")
  const store = resetStore()
  return Response.json({
    worlds: store.worlds.size,
    entries: store.entries.size,
    sessions: store.sessions.size,
  })
}
