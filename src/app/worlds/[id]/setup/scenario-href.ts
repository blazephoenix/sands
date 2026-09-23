/**
 * Keeps a dev fixture scenario (`?scenario=`) when linking to another page,
 * so a forced state carries across navigation. Ticket 02 has an equivalent
 * `withScenario` in `src/components/worlds/`; reconcile at merge.
 */
import { currentScenario } from "@/lib/api-client"
import { SCENARIO_QUERY } from "@/fixtures/scenarios"

export function withScenario(href: string) {
  const scenario = currentScenario()
  if (!scenario) return href
  const url = new URL(href, "http://sands.local")
  url.searchParams.set(SCENARIO_QUERY, scenario)
  return `${url.pathname}${url.search}${url.hash}`
}
