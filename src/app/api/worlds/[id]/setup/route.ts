/**
 * POST /api/worlds/[id]/setup: runs setup (spec §8) and streams `SetupEvent`s
 * as NDJSON, ending in the World (now `review`) with its drafted Entries, or an
 * error that leaves the World in `draft`.
 *
 * Scripted until the engine lands (src/fixtures/setup-script.ts): realistic
 * timing, compressed in dev. Scenarios: `drafter-error`, `solvability-failure`,
 * and the `slow` / `request-error` gate every route honours. A World that is not
 * in `draft` answers 409 before any progress is sent.
 */
import type { SetupEvent } from "@/domain/events"
import { assertSetupCanStart, runScriptedSetup, setupTimeScale } from "@/fixtures/setup-script"
import { getWorld } from "@/fixtures/worlds"
import { handle } from "@/server/http"
import { ndjsonResponse } from "@/server/ndjson"
import { getScenarios, scenarioGate } from "@/server/scenarios"

type Context = { params: Promise<{ id: string }> }

export const POST = handle(async (request: Request, { params }: Context) => {
  const blocked = await scenarioGate(request)
  if (blocked) return blocked
  const { id } = await params
  const world = getWorld(id)
  assertSetupCanStart(world)
  const scenarios = getScenarios(request)
  return ndjsonResponse<SetupEvent>(
    (emit, elapsed, signal) =>
      runScriptedSetup(world.id, {
        emit,
        elapsed,
        signal,
        timeScale: setupTimeScale(),
        drafterError: scenarios.has("drafter-error"),
        solvabilityFailure: scenarios.has("solvability-failure"),
      }),
    { request }
  )
})
