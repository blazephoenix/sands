/**
 * The real models a Turn runs with: the Grok Writer and the TypeSafe Judge,
 * both configured from the environment (spec §15). Server-only. The Turn
 * route's tests replace this module with fakes.
 */
import { GrokWriter } from "@/models/grok-writer"
import { TypeSafeJudge } from "@/models/typesafe-judge"

import type { TurnModels } from "./turn"

export function turnModels(): TurnModels {
  return { writer: new GrokWriter(), judge: new TypeSafeJudge() }
}
