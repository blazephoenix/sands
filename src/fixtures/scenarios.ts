/**
 * Named fixture scenarios: the one place that lists every UI state a developer
 * can force in dev. Page tickets read this registry; they do not edit it.
 *
 * How to force a scenario (dev only; ignored in production builds):
 * - On a page: add `?scenario=<id>` to the page URL, or pick it from the
 *   header's Scenario menu. The client helper (`src/lib/api-client.ts`) sends
 *   it with every API call as the `x-sands-scenario` header.
 * - On a route directly: send `x-sands-scenario: <id>` or add `?scenario=<id>`.
 * - Several at once: comma-separated, e.g. `?scenario=slow,second-round`.
 *
 * Route handlers read them with `getScenarios(request)` from
 * `src/server/scenarios.ts`. `slow` and `request-error` apply to every route
 * through `scenarioGate`; the rest are read by the routes they name.
 */

export const SCENARIOS = {
  slow: {
    label: "Slow response",
    description: "Every API response waits about 2.5 s, so loading states can be seen.",
    routes: ["every route"],
  },
  "request-error": {
    label: "Request error",
    description: "Every API route answers 500 with a stated cause, so error states and Retry can be tried.",
    routes: ["every route"],
  },
  empty: {
    label: "No Worlds",
    description: "The Worlds list is empty, so the Worlds home shows its empty state.",
    routes: ["GET /api/worlds"],
  },
  "drafter-error": {
    label: "Drafter error",
    description: "Setup fails at the World call; the World stays in draft.",
    routes: ["POST /api/worlds/[id]/setup"],
  },
  "solvability-failure": {
    label: "Solvability failure",
    description: "Setup's solvability check fails on all three attempts and ends with the exact gaps.",
    routes: ["POST /api/worlds/[id]/setup"],
  },
  "judge-outage": {
    label: "Judge outage",
    description: "The next Turn fails while judging; nothing in the Session changes.",
    routes: ["POST /api/sessions/[id]/turn"],
  },
  "second-round": {
    label: "Second Round",
    description: "The next Turn's first Round rejects both Drafts; Round 2 passes.",
    routes: ["POST /api/sessions/[id]/turn"],
  },
  "flagged-turn": {
    label: "Flagged Turn",
    description: "The next Turn fails three Rounds and ships its least-violating Draft, flagged.",
    routes: ["POST /api/sessions/[id]/turn"],
  },
  "background-pending": {
    label: "Background pending",
    description: "The last Turn's background work is still running; the next Turn waits for it.",
    routes: ["POST /api/sessions/[id]/turn", "GET /api/sessions/[id]"],
  },
  "ending-win": {
    label: "Ending: win",
    description: "The next Turn reaches the win Ending.",
    routes: ["POST /api/sessions/[id]/turn"],
  },
  "ending-death": {
    label: "Ending: death",
    description: "The next Turn reaches the death Ending.",
    routes: ["POST /api/sessions/[id]/turn"],
  },
  "ending-removed": {
    label: "Ending: removed",
    description: "The next Turn removes the Player character from the case.",
    routes: ["POST /api/sessions/[id]/turn"],
  },
} as const satisfies Record<string, { label: string; description: string; routes: readonly string[] }>

export type ScenarioId = keyof typeof SCENARIOS

export const SCENARIO_IDS = Object.keys(SCENARIOS) as ScenarioId[]

export const SCENARIO_HEADER = "x-sands-scenario"
export const SCENARIO_QUERY = "scenario"

export function isScenarioId(value: string): value is ScenarioId {
  return value in SCENARIOS
}

/** Parses "slow,second-round" into known scenario ids, ignoring unknown ones. */
export function parseScenarios(raw: string | null | undefined): ScenarioId[] {
  if (!raw) return []
  return [...new Set(raw.split(",").map((part) => part.trim()).filter(isScenarioId))]
}

/** Scenarios are a development aid; production ignores them. */
export function scenariosEnabled() {
  return process.env.NODE_ENV !== "production"
}

/** How long the `slow` scenario delays each response. */
export const SLOW_SCENARIO_DELAY_MS = 2500
