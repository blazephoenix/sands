/**
 * Test data: Turns that satisfy the Turn contract, the Opening and later
 * Turns alike. Used only by tests.
 */
import type { Turn, TurnLog } from "@/domain/session"
import { startingState } from "@/engine/initial-state"

import { testTime } from "./london"

function log(
  id: string,
  passage: string,
  played: Pick<TurnLog, "reading" | "outcome">
): TurnLog {
  return {
    ...played,
    directive: played.outcome
      ? "Continue the scene."
      : "Opening. Set the first scene.",
    rounds: [
      {
        index: 1,
        feedback: [],
        drafts: [
          {
            id: `${id}-r1a`,
            text: passage,
            rules: [
              {
                rule: "agency",
                question: "Does the Player character do more than asked?",
                probability: 0.08,
                failed: false,
                flagged: false,
              },
            ],
            highestViolation: 0.08,
            passed: true,
            shipped: true,
          },
        ],
      },
    ],
    discovery: [],
    background: null,
    timings: {
      totalMs: 4000,
      readingMs: played.reading ? 400 : 0,
      resolvingMs: played.outcome ? 3 : 0,
      writingMs: 1500,
      judgingMs: 640,
      backgroundMs: null,
    },
    jevModelVersion: "jev-test",
  }
}

/** A Session's Opening (Turn 0): no Player input, reading or Outcome; background work pending. */
export function openingTurn(sessionId: string, locationId: string): Turn {
  const id = `${sessionId}-t0`
  const passage = "The fog had come up from the river before noon."
  return {
    id,
    sessionId,
    idx: 0,
    playerInput: null,
    passage,
    flagged: false,
    log: log(id, passage, { reading: null, outcome: null }),
    state: startingState(locationId),
    backgroundStatus: "pending",
    createdAt: testTime(120),
  }
}

/** A Turn after the Opening, with its Player input, reading and Outcome. */
export function playerTurn(
  sessionId: string,
  idx: number,
  input: string,
  locationId: string
): Turn {
  const id = `${sessionId}-t${idx}`
  const passage = `Turn ${idx}: Jacob does as he said.`
  return {
    id,
    sessionId,
    idx,
    playerInput: input,
    passage,
    flagged: false,
    log: log(id, passage, {
      reading: {
        intent: { value: "examine", probability: 0.91 },
        target: { value: "none", label: "none", probability: 0.83 },
        classification: {
          value: "on_script",
          probability: 0.93,
          belowFloor: false,
        },
      },
      outcome: {
        kind: "examined",
        summary: "Jacob examines the scene.",
        reputationDelta: 0,
        offScriptDelta: 0,
        deathRoll: null,
        ending: "none",
      },
    }),
    state: startingState(locationId),
    backgroundStatus: "pending",
    createdAt: testTime(120 + idx),
  }
}
