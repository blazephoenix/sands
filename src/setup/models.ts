/**
 * The real models setup runs with: the OpenAI Drafter and the TypeSafe Judge,
 * both configured from the environment (spec §15). Server-only. The setup
 * route's tests replace this module with fakes.
 */
import { OpenAIDrafter } from "@/models/openai-drafter"
import { TypeSafeJudge } from "@/models/typesafe-judge"

import type { SetupModels } from "./run"

export function setupModels(): SetupModels {
  return { drafter: new OpenAIDrafter(), judge: new TypeSafeJudge() }
}
