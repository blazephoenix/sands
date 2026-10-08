/**
 * One Turn (spec §9.1), or the Opening (spec §9.0; ADR-0014), with progress
 * streamed as `TurnEvent`s:
 *
 *   [reading -> resolving] -> [writing -> judging] x up to 3 Rounds -> commit
 *
 * - **The Judge recognizes, code decides** (ADR-0001). The Reading is one
 *   Judge call; the Outcome, the Directive, which Draft ships and what the
 *   Discovery changes are pure functions.
 * - **Nothing unjudged ships** (ADR-0003). Each Round the Writer writes two
 *   Drafts in parallel and the Judge rules on both in one call, with every
 *   Rule question and the Discovery questions. After three failed Rounds the
 *   least-violating Draft ships and the Turn is Flagged.
 * - **Models first, then one transaction** (research §6). Nothing is saved
 *   until a Passage ships; `insertTurn` refuses a Turn another request saved
 *   first. A Writer or Judge failure (after the model client's one retry,
 *   spec §13) ends the stream with an error and changes nothing.
 * - **Background work** (spec §9.2; `./background.ts`): a shipped Turn is
 *   stored `pending` and its Background work starts once the Passage is
 *   sent. The next Turn first waits for it (the `waiting_background` phase),
 *   then plays from the state it merged. A Turn that ended the Session runs
 *   none: it is stored `done` with no background time, which the harness
 *   pane shows as "no Background work ran".
 */
import { codexSlice } from "@/codex/slice"
import type { Db } from "@/db/client"
import { getEntry, listSessionEntries } from "@/db/entries"
import { StoreError } from "@/db/errors"
import { getSession, insertTurn, listTurns } from "@/db/sessions"
import { getWorld } from "@/db/worlds"
import { isLiveEntry } from "@/domain/entry"
import type { StreamErrorCode, TurnEvent } from "@/domain/events"
import type { Draft, PlayerState, Round, TurnLog } from "@/domain/session"
import { newId } from "@/lib/ids"
import { nowIso, nowMs } from "@/lib/time"
import type { Drafter } from "@/models/drafter"
import type { Judge } from "@/models/judge"
import type { Writer } from "@/models/writer"
import {
  chooseShipped,
  discoveryQuestions,
  judgeState,
  readDraft,
  retryFeedback,
  ruleQuestions,
  type DiscoveryQuestion,
  type DraftVerdict,
  type RuleQuestion,
  type SceneContext,
} from "@/rules/rules"

import {
  backgroundWorkFor,
  failInterruptedBackgroundWork,
  metExitConditions,
  NO_BACKGROUND_RESULTS,
  startBackgroundWork,
} from "./background"
import { ENGINE_CONFIG } from "./config"
import { buildDirective, renderDirective } from "./direct"
import { applyDiscovery } from "./discovery"
import { initialState } from "./initial-state"
import { readingQuestions, readReading, type Reading } from "./reading"
import { resolve, type Resolution } from "./resolve"
import { deathRollFor } from "./rng"
import { writerRequest } from "./writer-prompt"

export type TurnModels = { writer: Writer; judge: Judge; drafter: Drafter }

export type TurnStream = {
  emit: (event: TurnEvent) => void
  /** Milliseconds since the stream started. */
  elapsed: () => number
  /** Aborts when the Player leaves. */
  signal: AbortSignal
}

/** A model step that failed: the stream's error code and the Player's message. */
class TurnFailure extends Error {
  constructor(
    readonly code: StreamErrorCode,
    message: string
  ) {
    super(message)
  }
}

/** A model error's own words, short enough for the story column. */
function reason(error: unknown) {
  const text = error instanceof Error ? error.message : String(error)
  const line = text.split("\n")[0].trim()
  return line.length > 200 ? `${line.slice(0, 197)}...` : line
}

/** The Judge's id for Draft `draft`'s Rule question `n`, and for its Discovery question `n`. */
const ruleKey = (draft: number, rule: string, n: number) =>
  `d${draft}_${rule}_${n}`
const discoveryKey = (draft: number, n: number) => `d${draft}_disc_${n}`

/** One Draft's questions, verdict and Discovery answers, before it is logged. */
type Judged = {
  id: string
  text: string
  reasoning: string | null
  questions: RuleQuestion[]
  discovery: DiscoveryQuestion[]
  verdict: DraftVerdict
  discoveryAnswers: number[]
}

/** Resolves when `work` settles, or rejects when the Player leaves first. */
function waitFor(work: Promise<void>, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason)
    const onAbort = () => reject(signal.reason)
    signal.addEventListener("abort", onAbort, { once: true })
    void work.finally(() => {
      signal.removeEventListener("abort", onAbort)
      resolve()
    })
  })
}

/**
 * Plays one Turn of a Session: the Opening when `input` is null. Never
 * throws: every outcome ends the stream with one `result` or one `error`
 * event (none when the Player has left). The route has already checked that
 * the request fits the Session (ADR-0014).
 */
export async function runTurn(
  deps: TurnModels & { db: Db },
  request: { sessionId: string; input: string | null },
  stream: TurnStream,
  options: { log?: (line: string) => void } = {}
): Promise<void> {
  const { db, writer, judge, drafter } = deps
  const { emit, elapsed, signal } = stream
  const log = options.log ?? ((line: string) => console.info(line))
  const { sessionId, input } = request
  let started = nowMs()
  const timings = { readingMs: 0, resolvingMs: 0, writingMs: 0, judgingMs: 0 }
  let jevModelVersion = ""

  const phase = (
    name:
      "waiting_background" | "reading" | "resolving" | "writing" | "judging",
    round: number | null = null
  ) => emit({ type: "phase", phase: name, round, at: elapsed() })

  /** Runs one model call; a failure becomes a TurnFailure with the Player's message. */
  async function modelStep<T>(
    code: "writer_error" | "judge_outage",
    what: string,
    call: () => Promise<T>
  ): Promise<T> {
    try {
      return await call()
    } catch (error) {
      if (signal.aborted) throw error
      log(`[turn] session=${sessionId} ${code}: ${String(error)}`)
      throw new TurnFailure(
        code,
        `${what}: ${reason(error)} Nothing was saved; try again.`
      )
    }
  }

  try {
    // 0. Wait for the last Turn's Background work (spec §9.1 step 1).
    const background = backgroundWorkFor(sessionId)
    if (background) {
      phase("waiting_background")
      await waitFor(background, signal)
      started = nowMs()
    }
    failInterruptedBackgroundWork(db, sessionId)

    const session = getSession(db, sessionId)
    const world = getWorld(db, session.worldId)
    const brief = world.brief
    if (!brief) throw new Error("the Session's World has no Brief")
    const entries = listSessionEntries(db, sessionId)
    const turns = listTurns(db, sessionId)
    const idx = turns.length
    const turnId = newId("turn")
    const lastPassage = turns.at(-1)?.passage ?? ""

    let before: PlayerState
    if (input === null) {
      const start = initialState(entries)
      if (!start)
        throw new TurnFailure(
          "conflict",
          "This Session has no start Location, so its Opening cannot be written. Restore the start Location in the Codex, then try again."
        )
      before = start
    } else {
      before = turns.at(-1)!.state
    }

    // 1. Read the input and resolve the Outcome (not for the Opening).
    let reading: Reading | null = null
    let resolution: Resolution | null = null
    if (input !== null) {
      phase("reading")
      const t0 = nowMs()
      const asked = readingQuestions({
        brief,
        entries,
        state: before,
        playerInput: input,
        lastPassage,
      })
      const answered = await modelStep(
        "judge_outage",
        "The Judge could not read your action",
        () =>
          judge.ask(
            { state: asked.state, questions: asked.questions },
            { signal }
          )
      )
      jevModelVersion = answered.model
      reading = readReading(answered.answers, asked.targets)
      timings.readingMs = nowMs() - t0

      phase("resolving")
      const t1 = nowMs()
      resolution = resolve({
        state: before,
        entries,
        intent: reading.intent,
        target: reading.target,
        classification: reading.classification,
        deathRoll: deathRollFor(session.seed, idx),
      })
      timings.resolvingMs = nowMs() - t1
      log(
        `[turn] session=${sessionId} turn=${idx} intent=${reading.log.intent.value} target=${reading.log.target.label} classification=${reading.classification} outcome=${resolution.outcome.action?.kind ?? "none"} penalty=${resolution.outcome.penalty.kind} ending=${resolution.outcome.ending}`
      )
    }
    const state = resolution?.state ?? before

    // 2. Build the Directive and the scene the Writer and the Judge see.
    const directive = buildDirective({
      brief,
      entries,
      state,
      resolution,
      playerInput: input,
      metExitConditionIds: [...metExitConditions(turns)],
    })
    const allowedReveals = resolution?.allowedReveals ?? []
    const discoverableClues = resolution?.discoverableClues ?? []
    const context: SceneContext = {
      brief,
      entries,
      state,
      playerInput: input,
      outcome: resolution?.outcome ?? null,
      directive,
      slice: codexSlice({
        entries,
        state,
        texts: [input ?? "", lastPassage],
        targetId: reading?.target.kind === "entry" ? reading.target.id : null,
        allowedReveals,
        discoverableClues,
      }),
      allowedReveals,
      discoverableClues,
    }
    const passages = turns.map((t) => t.passage)

    // 3. Rounds: write two Drafts, judge both in one call, then ship one or write another Round.
    const rounds: { feedback: string[]; drafts: Judged[] }[] = []
    let feedback: string[] = []
    let shipped: { id: string; flagged: boolean } | null = null
    for (let index = 1; index <= ENGINE_CONFIG.maxRounds; index++) {
      phase("writing", index)
      const t2 = nowMs()
      const prompt = writerRequest({
        brief,
        entries,
        directive,
        slice: context.slice,
        recentPassages: passages,
        playerInput: input,
        feedback,
      })
      const written = await modelStep(
        "writer_error",
        "The Writer could not write the Passage",
        () =>
          Promise.all(
            Array.from({ length: ENGINE_CONFIG.draftsPerRound }, () =>
              writer.write(prompt, { signal })
            )
          )
      )
      timings.writingMs += nowMs() - t2

      phase("judging", index)
      const t3 = nowMs()
      const texts = written.map((w) => w.text)
      const asked = texts.map((text, i) => ({
        questions: ruleQuestions(context, i, text),
        discovery: discoveryQuestions(context, i),
      }))
      const questions = Object.fromEntries(
        asked.flatMap(({ questions: rules, discovery }, i) => [
          ...rules.map((q, n) => [ruleKey(i, q.rule, n), q.question]),
          ...discovery.map((q, n) => [discoveryKey(i, n), q.question]),
        ])
      )
      const answered = await modelStep(
        "judge_outage",
        "The Judge could not rule on the Drafts",
        () =>
          judge.ask(
            { state: judgeState(context, texts), questions },
            { signal }
          )
      )
      jevModelVersion = answered.model
      timings.judgingMs += nowMs() - t3
      const noul = (id: string) =>
        (answered.answers[id] as { noul: number }).noul
      const drafts: Judged[] = asked.map(
        ({ questions: rules, discovery }, i) => ({
          id: `${turnId}-r${index}${String.fromCharCode(97 + i)}`,
          text: texts[i],
          reasoning: written[i].reasoning,
          questions: rules,
          discovery,
          verdict: readDraft(
            rules,
            rules.map((q, n) => noul(ruleKey(i, q.rule, n)))
          ),
          discoveryAnswers: discovery.map((_, n) => noul(discoveryKey(i, n))),
        })
      )
      rounds.push({ feedback, drafts })
      log(
        `[turn] session=${sessionId} turn=${idx} round=${index} ${drafts.map((d) => `${d.id}=${d.verdict.passed ? "pass" : "fail"}@${d.verdict.highestViolation.toFixed(2)}`).join(" ")}`
      )

      shipped = chooseShipped(
        rounds.map((r) =>
          r.drafts.map((d) => ({
            id: d.id,
            passed: d.verdict.passed,
            highestViolation: d.verdict.highestViolation,
          }))
        ),
        ENGINE_CONFIG.maxRounds
      )
      if (shipped) break
      feedback = retryFeedback(
        drafts.map((d) => ({ questions: d.questions, result: d.verdict }))
      )
    }
    if (!shipped) throw new Error("the Round loop ended without a Draft")
    const winner = rounds
      .flatMap((r) => r.drafts)
      .find((d) => d.id === shipped.id)!

    // 4. Discovery for the shipped Draft.
    const discovered = applyDiscovery(
      state,
      entries,
      winner.discovery.map((q, n) => ({
        target: q.target,
        question: q.label,
        probability: winner.discoveryAnswers[n],
      }))
    )

    // 5. Commit, unless the Player has left.
    const loggedRounds: Round[] = rounds.map((round, i) => ({
      index: i + 1,
      feedback: round.feedback,
      drafts: round.drafts.map((d): Draft => ({
        id: d.id,
        text: d.text,
        ...(d.reasoning ? { reasoning: d.reasoning } : {}),
        rules: d.verdict.rules,
        highestViolation: d.verdict.highestViolation,
        passed: d.verdict.passed,
        shipped: d.id === winner.id,
      })),
    }))
    const ended = discovered.state.ending !== "none"
    const turnLog: TurnLog = {
      reading: reading?.log ?? null,
      outcome: resolution?.outcome ?? null,
      directive: renderDirective(directive),
      rounds: loggedRounds,
      discovery: discovered.discovery,
      background: ended ? NO_BACKGROUND_RESULTS : null,
      timings: {
        totalMs: nowMs() - started,
        ...timings,
        backgroundMs: null,
      },
      jevModelVersion,
    }
    signal.throwIfAborted()
    // The Author may have removed where the Player now stands while the Turn
    // was written (spec §7.2). Checked with no await before the insert, so no
    // Codex edit can land in between.
    const standing = getEntry(db, discovered.state.locationId)
    if (!isLiveEntry(standing))
      throw new TurnFailure(
        "conflict",
        `${standing.name.trim() || "The Location this Turn moves to"} was removed from the Codex while this Turn was played. Nothing was saved; restore it, or try another action.`
      )
    const saved = insertTurn(db, {
      id: turnId,
      sessionId,
      idx,
      playerInput: input,
      passage: winner.text,
      flagged: shipped.flagged,
      log: turnLog,
      state: discovered.state,
      backgroundStatus: ended ? "done" : "pending",
      createdAt: nowIso(),
    })
    emit({ type: "result", ...saved, entries: [], at: elapsed() })
    if (!ended)
      void startBackgroundWork(
        { db, drafter, judge },
        { sessionId, turnId },
        { log }
      )
  } catch (error) {
    if (signal.aborted) {
      log(`[turn] session=${sessionId} stopped: the Player left`)
      return
    }
    if (error instanceof TurnFailure || error instanceof StoreError) {
      emit({
        type: "error",
        code:
          error instanceof TurnFailure
            ? error.code
            : error.code === "not_found"
              ? "not_found"
              : "conflict",
        message: error.message,
        at: elapsed(),
      })
      return
    }
    log(
      `[turn] session=${sessionId} failed: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`
    )
    emit({
      type: "error",
      code: "internal",
      message: "The Turn stopped unexpectedly. Nothing was saved; try again.",
      at: elapsed(),
    })
  }
}
