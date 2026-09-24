/**
 * Background work (spec §9.2; CONTEXT.md): what the harness does after a
 * Passage ships that only matters from the next Turn on.
 *
 * - **New characters** (Drafter): characters the Passage names who are not in
 *   the story yet become proposed NPC Entries from play. The Drafter is given
 *   every name the story has, the Brief's characters included, not the Codex
 *   slice (research: the smoke Drafter proposed a Brief character), and code
 *   drops any name the story already has or the Passage never says.
 * - **Arc check** (Judge): one Noul per live Exit condition of the current Arc
 *   not already met, over the recent Turns. Code advances the Arc once every
 *   one of them has been met, on this Turn or an earlier one; never past the
 *   last Arc, and never for an Arc with no live Exit condition (the Codex
 *   pane shows that as a Gap).
 * - **Pacing check** (Judge, same call): once the Player has played
 *   `pacingWindow` Turns in the current Arc, "have they made progress toward
 *   its Exit conditions?" A no sets the Pacing nudge, which the next
 *   Directive turns into an opportunity; progress, or an Exit condition met
 *   this Turn, clears it. The nudge never advances an Arc. Experimental.
 *
 * The Opening runs only the new-character step: the Player has not acted, so
 * nothing can have met an Exit condition or stalled. A Turn that ended the
 * Session runs none (`runTurn` stores it done).
 *
 * The results are merged into the Turn's log and state in one transaction,
 * and its `background_status` becomes `done`. Any failure is recorded as
 * `failed` with its cause, and nothing else changes; play continues, and the
 * next Turn's Arc and pacing checks look again.
 *
 * **Waiting** (research §5): `after()` gives nothing to await, and the next
 * Turn must wait for this work. So the work runs as a promise kept per
 * Session on `globalThis` (every route module sees one map), which the next
 * Turn awaits; the Turn route also hands it to `after()` only to keep it
 * alive. A Turn left `pending` with no work running in this process was cut
 * off by a stopped server: it is marked `failed` rather than waited on.
 */
import { namesPerson, nameParts } from "@/codex/slice"
import type { Db } from "@/db/client"
import { insertEntries, listSessionEntries } from "@/db/entries"
import {
  getSession,
  listPendingBackgroundTurns,
  listTurns,
  updateTurn,
} from "@/db/sessions"
import { getWorld } from "@/db/worlds"
import type { Brief } from "@/domain/brief"
import {
  isLiveEntry,
  playerCharacterOf,
  type Entry,
  type EntryOfKind,
} from "@/domain/entry"
import {
  isOpening,
  turnLabel,
  type BackgroundResults,
  type PlayerState,
  type Turn,
} from "@/domain/session"
import { newId } from "@/lib/ids"
import { nowIso, nowMs } from "@/lib/time"
import type { Drafter } from "@/models/drafter"
import { noul, type Judge, type NoulQuestion } from "@/models/judge"
import { z } from "zod"

import { ENGINE_CONFIG } from "./config"

export type BackgroundModels = { drafter: Drafter; judge: Judge }

type Log = (line: string) => void

// New characters

const newCharactersSchema = z.object({
  characters: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      role: z.string().nullable(),
      personality: z.string().nullable(),
    })
  ),
})

const NEW_CHARACTERS_INSTRUCTIONS = `You read one Passage of a story and list the characters it names who are not yet in the story.

- A character is a person, or a being who speaks and acts, called by a proper name in the Passage.
- Leave out everyone in the list of known names, even when the Passage uses a shorter form, a title or only a surname of a known name.
- Leave out people called only by what they do ("a constable", "the landlady"), and places, groups and things.
- Describe each character only from what the Passage says. Invent nothing. Use null for a role or personality the Passage does not show.
- If the Passage names no new character, answer with an empty list.`

type Person = { name: string; aliases: readonly string[] }

/** Everyone and everything the story already has a name for: the Codex, removed Entries included, and the Brief's characters. */
function knownNames(entries: readonly Entry[], brief: Brief) {
  const people: Person[] = [
    ...entries
      .filter(
        (e): e is EntryOfKind<"character" | "npc"> =>
          e.kind === "character" || e.kind === "npc"
      )
      .map((e) => ({ name: e.name, aliases: e.data.aliases })),
    ...brief.characters.map((c) => ({ name: c.name, aliases: c.aliases })),
  ].filter((p) => p.name.trim())
  const names = [
    ...people.flatMap((p) => [p.name, ...p.aliases]),
    ...entries
      .filter((e) => e.kind !== "character" && e.kind !== "npc")
      .map((e) => e.name),
  ]
    .map((name) => name.trim())
    .filter(Boolean)
  return { people, names: [...new Set(names)] }
}

/** A name the story already has: the same name or alias, or only parts of a known person's name ("Carrow" for "Edmund Carrow"). */
function isKnown(name: string, known: ReturnType<typeof knownNames>) {
  const lower = name.toLowerCase()
  if (known.names.some((n) => n.toLowerCase() === lower)) return true
  const parts = nameParts(name).map((p) => p.toLowerCase())
  if (parts.length === 0) return false
  return known.people.some((person) => {
    const theirs = new Set(nameParts(person.name).map((p) => p.toLowerCase()))
    return parts.every((part) => theirs.has(part))
  })
}

async function nameNewCharacters(
  drafter: Drafter,
  input: {
    worldId: string
    brief: Brief
    entries: readonly Entry[]
    turn: Turn
  }
): Promise<EntryOfKind<"npc">[]> {
  const { worldId, brief, entries, turn } = input
  const known = knownNames(entries, brief)
  const { output } = await drafter.draft({
    call: "new_characters",
    instructions: NEW_CHARACTERS_INSTRUCTIONS,
    prompt: [
      "Known names:",
      ...known.names.map((name) => `- ${name}`),
      "",
      "Passage:",
      turn.passage,
    ].join("\n"),
    schema: newCharactersSchema,
  })

  const now = nowIso()
  const added: EntryOfKind<"npc">[] = []
  const seen = new Set<string>()
  for (const character of output.characters) {
    const name = character.name.trim()
    if (!name || seen.has(name.toLowerCase())) continue
    if (!namesPerson(turn.passage, { name, aliases: [] })) continue
    if (isKnown(name, known)) continue
    seen.add(name.toLowerCase())
    added.push({
      id: newId("entry"),
      worldId,
      sessionId: turn.sessionId,
      templateId: null,
      kind: "npc",
      name,
      description: character.description.trim(),
      keyFacts: [],
      data: {
        role: character.role?.trim() ?? "",
        age: "",
        personality: character.personality?.trim() ?? "",
        backstory: "",
        isPlayer: false,
        hiddenFields: [],
        aliases: [],
      },
      source: "play",
      sourceTurn: turn.idx,
      status: "proposed",
      jevFlags: [],
      seenAt: null,
      createdAt: now,
      updatedAt: now,
    })
  }
  return added
}

// The Arc check

/** Exit conditions the Arc check found met, across the Session's Turns. */
export function metExitConditions(turns: readonly Turn[]) {
  const met = new Set<string>()
  for (const turn of turns)
    for (const check of turn.log.background?.arcCheck ?? [])
      if (check.met) met.add(check.exitConditionId)
  return met
}

function exitConditionsOf(entries: readonly Entry[], arcIndex: number) {
  return entries.filter(
    (e): e is EntryOfKind<"exit_condition"> =>
      e.kind === "exit_condition" &&
      isLiveEntry(e) &&
      e.data.arcIndex === arcIndex
  )
}

const conditionText = (exit: EntryOfKind<"exit_condition">) =>
  exit.data.condition.trim() || exit.name

function exitConditionQuestion(
  exit: EntryOfKind<"exit_condition">
): NoulQuestion {
  return noul(
    {
      question:
        "Has `exit_condition` come true in the story, as `recent_turns` tell it?",
      exit_condition: conditionText(exit),
    },
    {
      true: "The Passages show every part of `exit_condition` done in the story: it happened on the page, or the Passages state that it has happened.",
      false:
        "Some part of `exit_condition` is still undone, or it is only planned, promised, guessed at or talked about as a possibility, or the Passages do not show it.",
    }
  )
}

/** What the Judge reads for the Arc and pacing checks: the current Arc and the last few Turns. */
function checkState(input: {
  brief: Brief
  entries: readonly Entry[]
  turns: readonly Turn[]
  state: PlayerState
  unmet: readonly EntryOfKind<"exit_condition">[]
}) {
  const { brief, entries, turns, state, unmet } = input
  const byId = new Map(entries.map((e) => [e.id, e]))
  const arc = brief.arcs[state.arcIndex]
  return {
    player_character: playerCharacterOf(entries)?.name ?? "",
    current_arc: {
      name: arc?.name.trim() ?? "",
      description: arc?.description.trim() ?? "",
      exit_conditions: unmet.map(conditionText),
    },
    current_location: byId.get(state.locationId)?.name ?? "",
    clues_found: state.cluesFound.map((id) => byId.get(id)?.name ?? id),
    recent_turns: turns.slice(-ENGINE_CONFIG.pacingWindow).map((t) => ({
      turn: turnLabel(t),
      player_input: t.playerInput ?? "(the Opening: the Player had not acted)",
      passage: t.passage,
    })),
  }
}

// The pacing check

/**
 * Turns the Player has played in the current Arc, counted back from the
 * latest. A Turn whose Arc check advanced into this Arc was played in the one
 * before.
 */
function turnsInArc(turns: readonly Turn[], arcIndex: number) {
  let count = 0
  for (const turn of [...turns].reverse()) {
    if (isOpening(turn) || turn.state.arcIndex !== arcIndex) break
    if (turn.log.background?.arcAdvancedTo === arcIndex) break
    count++
  }
  return count
}

const PACING_QUESTION = noul(
  "Over `recent_turns`, has the Player made progress toward `current_arc.exit_conditions`?",
  {
    true: "In at least one of `recent_turns` the Player character does something that brings an Exit condition closer: reaches a person or place it needs, learns or finds something it depends on, or completes part of it.",
    false:
      "The recent Turns circle without moving toward any Exit condition: repeated actions, idle talk, wandering, or scenes that change nothing the Exit conditions depend on.",
  }
)

const stalledReason = () =>
  `no progress toward the current Arc's Exit conditions in the last ${ENGINE_CONFIG.pacingWindow} Turns`

// The run

/** A model error's first line, short enough for the harness pane. */
function reason(error: unknown) {
  const text = error instanceof Error ? error.message : String(error)
  const line = text.split("\n")[0].trim()
  return line.length > 300 ? `${line.slice(0, 297)}...` : line
}

/**
 * Runs one Turn's Background work and merges its results into the Turn.
 * Never throws: a failure is recorded on the Turn as `failed`. Does nothing
 * for a Turn whose Background work is not pending.
 */
export async function runBackgroundWork(
  deps: BackgroundModels & { db: Db },
  request: { sessionId: string; turnId: string },
  options: { log?: Log } = {}
): Promise<void> {
  const { db, drafter, judge } = deps
  const log = options.log ?? ((line: string) => console.info(line))
  const started = nowMs()
  let turn: Turn | undefined
  try {
    const session = getSession(db, request.sessionId)
    const brief = getWorld(db, session.worldId).brief
    if (!brief) throw new Error("the Session's World has no Brief")
    const entries = listSessionEntries(db, session.id)
    const all = listTurns(db, session.id)
    turn = all.find((t) => t.id === request.turnId)
    if (!turn || turn.backgroundStatus !== "pending") return

    const ran = turn
    const turns = all.filter((t) => t.idx <= ran.idx)
    const state = ran.state

    // The Arc check, for Turns after the Opening.
    const met = metExitConditions(turns)
    const exits = exitConditionsOf(entries, state.arcIndex)
    const unmet = isOpening(ran) ? [] : exits.filter((e) => !met.has(e.id))
    const askPacing =
      unmet.length > 0 &&
      turnsInArc(turns, state.arcIndex) >= ENGINE_CONFIG.pacingWindow
    const questions: Record<string, NoulQuestion> = Object.fromEntries(
      unmet.map((exit, n) => [`exit_${n}`, exitConditionQuestion(exit)])
    )
    if (askPacing) questions.pacing = PACING_QUESTION
    const ask = () =>
      Object.keys(questions).length === 0
        ? null
        : judge.ask({
            state: checkState({ brief, entries, turns, state, unmet }),
            questions,
          })

    const [added, answered] = await Promise.all([
      nameNewCharacters(drafter, {
        worldId: session.worldId,
        brief,
        entries,
        turn: ran,
      }),
      ask(),
    ])
    const noulOf = (id: string) =>
      (answered?.answers[id] as { noul: number } | undefined)?.noul ?? 0

    const arcCheck = unmet.map((exit, n) => {
      const probability = noulOf(`exit_${n}`)
      return {
        exitConditionId: exit.id,
        probability,
        met: probability >= ENGINE_CONFIG.exitConditionMetAt,
      }
    })
    for (const check of arcCheck) if (check.met) met.add(check.exitConditionId)
    const advance =
      !isOpening(ran) &&
      exits.length > 0 &&
      exits.every((e) => met.has(e.id)) &&
      state.arcIndex + 1 < brief.arcs.length

    const progressed = arcCheck.some((check) => check.met)
    const pacing = askPacing
      ? (() => {
          const probability = noulOf("pacing")
          const nudge =
            !progressed && probability < ENGINE_CONFIG.pacingProgressAt
          return { probability, nudge, reason: nudge ? stalledReason() : null }
        })()
      : null
    const nextState: PlayerState = {
      ...state,
      arcIndex: advance ? state.arcIndex + 1 : state.arcIndex,
      pacingNudge:
        progressed || advance || pacing
          ? { active: pacing?.nudge ?? false, reason: pacing?.reason ?? null }
          : state.pacingNudge,
    }

    const results: BackgroundResults = {
      newEntryIds: added.map((e) => e.id),
      arcCheck,
      arcAdvancedTo: advance ? nextState.arcIndex : null,
      pacing,
      error: null,
    }
    db.transaction((tx) => {
      insertEntries(tx, added)
      updateTurn(tx, {
        ...finished(ran, "done", results, nowMs() - started),
        state: nextState,
      })
    })
    log(
      `[background] session=${session.id} turn=${ran.idx} new=${added.length} met=${arcCheck.filter((c) => c.met).length}/${arcCheck.length} arc=${nextState.arcIndex} nudge=${nextState.pacingNudge.active}`
    )
  } catch (error) {
    log(
      `[background] session=${request.sessionId} turn=${request.turnId} failed: ${String(error)}`
    )
    if (!turn) return
    try {
      updateTurn(
        db,
        finished(
          turn,
          "failed",
          { ...EMPTY_RESULTS, error: reason(error) },
          nowMs() - started
        )
      )
    } catch (stored) {
      // The Session or its World was deleted meanwhile: nothing is left to record on.
      log(`[background] could not record the failure: ${String(stored)}`)
    }
  }
}

// Running, waiting and interrupted work

declare global {
  var __sandsBackgroundWork: Map<string, Promise<void>> | undefined
}

function running(): Map<string, Promise<void>> {
  globalThis.__sandsBackgroundWork ??= new Map()
  return globalThis.__sandsBackgroundWork
}

/** Starts a Turn's Background work; the next Turn of its Session waits for it. */
export function startBackgroundWork(
  deps: BackgroundModels & { db: Db },
  request: { sessionId: string; turnId: string },
  options: { log?: Log } = {}
): Promise<void> {
  const work: Promise<void> = runBackgroundWork(deps, request, options).finally(
    () => {
      if (running().get(request.sessionId) === work)
        running().delete(request.sessionId)
    }
  )
  running().set(request.sessionId, work)
  return work
}

/** The Session's Background work while it runs in this process, else undefined. It never rejects. */
export function backgroundWorkFor(
  sessionId: string
): Promise<void> | undefined {
  return running().get(sessionId)
}

const INTERRUPTED =
  "Background work stopped before it finished: the server stopped. The Arc and pacing checks run again on the next Turn."

/**
 * Marks as failed every Turn left `pending` with no Background work running
 * in this process: of one Session, or of every Session when the server
 * starts. Returns how many it marked.
 */
export function failInterruptedBackgroundWork(
  db: Db,
  sessionId?: string
): number {
  const stranded = listPendingBackgroundTurns(db, sessionId).filter(
    (turn) => !backgroundWorkFor(turn.sessionId)
  )
  for (const turn of stranded)
    updateTurn(
      db,
      finished(turn, "failed", { ...EMPTY_RESULTS, error: INTERRUPTED }, null)
    )
  return stranded.length
}

const EMPTY_RESULTS: BackgroundResults = {
  newEntryIds: [],
  arcCheck: [],
  arcAdvancedTo: null,
  pacing: null,
  error: null,
}

function finished(
  turn: Turn,
  status: "done" | "failed",
  results: BackgroundResults,
  backgroundMs: number | null
): Turn {
  return {
    ...turn,
    backgroundStatus: status,
    log: {
      ...turn.log,
      background: results,
      timings: { ...turn.log.timings, backgroundMs },
    },
  }
}
