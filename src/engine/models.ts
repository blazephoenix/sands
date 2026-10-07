/**
 * The real models a Turn runs with: the Grok Writer, the TypeSafe Judge and,
 * for Background work, the OpenAI Drafter, all configured from the
 * environment (spec §15). Server-only. The Turn route's tests replace this
 * module with fakes.
 */
import { GrokWriter } from "@/models/grok-writer"
import { OpenAIDrafter } from "@/models/openai-drafter"
import { TypeSafeJudge } from "@/models/typesafe-judge"

import { ENGINE_CONFIG } from "./config"
import type { TurnModels } from "./turn"

/** Naming a Passage's new characters is one small call, not setup's large ones. */
const NEW_CHARACTERS_TIMEOUT_MS = 60_000

export function turnModels(): TurnModels {
  return {
    writer: new GrokWriter({
      maxOutputTokens: ENGINE_CONFIG.writerMaxOutputTokens,
    }),
    judge: new TypeSafeJudge(),
    drafter: new OpenAIDrafter({ timeoutMs: NEW_CHARACTERS_TIMEOUT_MS }),
  }
}
