/**
 * Server side of the named scenarios (`src/fixtures/scenarios.ts`).
 */
import {
  SCENARIO_HEADER,
  SCENARIO_QUERY,
  SLOW_SCENARIO_DELAY_MS,
  parseScenarios,
  scenariosEnabled,
  type ScenarioId,
} from "@/fixtures/scenarios"

import { apiError } from "./http"

/** The scenarios forced on this request, from the header and the query string. */
export function getScenarios(request: Request): Set<ScenarioId> {
  if (!scenariosEnabled()) return new Set()
  const fromHeader = parseScenarios(request.headers.get(SCENARIO_HEADER))
  const fromQuery = parseScenarios(new URL(request.url).searchParams.get(SCENARIO_QUERY))
  return new Set([...fromHeader, ...fromQuery])
}

export function hasScenario(request: Request, id: ScenarioId) {
  return getScenarios(request).has(id)
}

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * Applies the scenarios every route honours. Call first in a handler:
 *
 *   const blocked = await scenarioGate(request)
 *   if (blocked) return blocked
 *
 * `slow` delays; `request-error` returns a 500 with a stated cause.
 */
export async function scenarioGate(request: Request): Promise<Response | null> {
  const scenarios = getScenarios(request)
  if (scenarios.has("slow")) await sleep(SLOW_SCENARIO_DELAY_MS)
  if (scenarios.has("request-error")) {
    return apiError(
      500,
      "scenario_request_error",
      "The server could not complete this request (forced by the request-error scenario). Try again; nothing you typed was lost."
    )
  }
  return null
}
