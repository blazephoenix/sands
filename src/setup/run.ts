/**
 * A setup run (spec §8): parse the Brief, the World call, then the Story
 * logic call, Judge validation and the solvability check, retrying the Story
 * logic call with the Gaps as feedback. Progress streams as `SetupEvent`s.
 *
 *   parse -> world_call -> [story_logic_call -> validate -> solvability] x3
 *
 * - **Claim.** `claimSetup` moves a `draft` World to `drafting` before the
 *   stream starts, which locks the Brief (saves are refused) and turns away a
 *   second run. It is one synchronous transaction, so two requests cannot
 *   both claim.
 * - **Models first, then one transaction** (research §6: better-sqlite3
 *   transactions are synchronous). Nothing is stored while the models run.
 *   When every step has passed, every Entry is stored and the World moves to
 *   `review` together.
 * - **Any failure returns the World to `draft`** with nothing stored (spec
 *   §13): a Drafter or Judge failure, solvability still failing after the
 *   last attempt, or the Author leaving (the request's signal aborts, which
 *   also cancels the model call in flight).
 * - **Retries.** Solvability failing, or a name the Drafter used that matches
 *   no Entry, re-runs the Story logic call with its previous draft and the
 *   Gaps, at most twice. Every Gap but one can be closed that way: the Story
 *   logic call can move a Clue, reveal one through Knowledge, or draft an
 *   Exit condition. It drafts no Locations, so a World the World call left
 *   with no start Location fails right after the World call, before any
 *   Story logic call is spent. Validation re-runs on each attempt for the
 *   new Story logic Entries; the World call's Entries are validated once.
 */
import type { Brief } from "@/domain/brief"
import { ENTRY_KIND_LABELS, ENTRY_KINDS, type Entry } from "@/domain/entry"
import type { SetupEvent, SetupStep, StreamErrorCode } from "@/domain/events"
import { isBriefLocked, type SolvabilityGap, type World } from "@/domain/world"
import type { Db } from "@/db/client"
import { insertEntries } from "@/db/entries"
import { StoreError } from "@/db/errors"
import { findWorld, getWorld, updateWorld } from "@/db/worlds"
import { newId } from "@/lib/ids"
import { nowIso } from "@/lib/time"
import type { Drafter } from "@/models/drafter"
import type { Judge } from "@/models/judge"

import { authorEntries } from "./author-entries"
import {
  storyLogicCallRequest,
  worldCallRequest,
  type StoryLogicDraft,
} from "./drafter-calls"
import type { NewEntryContext } from "./new-entries"
import { resolveStoryLogicDraft, resolveWorldDraft } from "./resolve"
import { checkSolvability } from "./solvability"
import { validateEntries } from "./validate"

/** The Story logic call runs once, then at most twice more with the gaps as feedback (spec §8 step 3). */
export const MAX_STORY_LOGIC_ATTEMPTS = 3

/**
 * Why setup cannot start for this World, or null when it can: only a `draft`
 * World runs setup.
 */
export function setupConflict(
  world: Pick<World, "setupStatus">
): string | null {
  if (!isBriefLocked(world)) return null
  return world.setupStatus === "drafting"
    ? "Setup is already running for this World. Wait for it to finish."
    : "Setup has already run for this World. Open the setup review instead."
}

function plural(count: number, one: string, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`
}

/** The parse step's detail, counted from the Brief itself: "8 Characters, 1 Location, 3 Arcs, 1 Ending". */
export function parseSummary(brief: Brief) {
  const parts = [plural(brief.characters.length, "Character")]
  if (brief.locations.length > 0)
    parts.push(plural(brief.locations.length, "Location"))
  parts.push(plural(brief.arcs.length, "Arc"), "1 Ending")
  return parts.join(", ")
}

/** "2 Locations, 1 NPC, 2 Exit conditions": what a Drafter call added. */
function draftedSummary(entries: readonly Entry[]) {
  const listed = ENTRY_KINDS.flatMap((kind) => {
    const count = entries.filter((e) => e.kind === kind).length
    const { singular, plural: many } = ENTRY_KIND_LABELS[kind]
    return count > 0 ? [plural(count, singular, many)] : []
  })
  return listed.length > 0 ? listed.join(", ") : "nothing drafted"
}

/**
 * "1 Entry with a Judge flag, 2 Entries the Judge is unsure about": the
 * setup review's words (its badges read "Judge flag" when an answer failed
 * and "Judge unsure" otherwise; CONTEXT.md keeps "flagged" for a Flagged
 * Turn).
 */
function judgeSummary(entries: readonly Entry[]) {
  const failed = entries.filter((e) =>
    e.jevFlags.some((flag) => flag.verdict === "fail")
  ).length
  const unsure = entries.filter((e) => e.jevFlags.length > 0).length - failed
  const parts = [
    ...(failed > 0
      ? [`${plural(failed, "Entry", "Entries")} with a Judge flag`]
      : []),
    ...(unsure > 0
      ? [`${plural(unsure, "Entry", "Entries")} the Judge is unsure about`]
      : []),
  ]
  return parts.length > 0 ? parts.join(", ") : "no Judge flags"
}

/**
 * Why setup failed when the last attempt still had Gaps. Names the Drafter
 * kept using that are not in the World are a different failure from a story
 * that cannot be won, and the Author should hear which one it was.
 */
function lastAttemptMessage(gaps: readonly SolvabilityGap[], attempts: number) {
  const ran = `The Story logic call ran ${plural(attempts, "time")}`
  if (gaps.every((gap) => gap.code === "unknown_name")) {
    return `${ran} and kept using names that are not in this World, so its draft could not be stored. The names are below. Run setup again; if it keeps happening, name the people and places the story needs in the Brief.`
  }
  return `${ran} and the story is still not solvable. The gaps from the last attempt are below. Make the Brief's Ending and Arcs clearer about how the story is won, then run setup again.`
}

/**
 * Claims a World for setup: `draft` -> `drafting`, which locks the Brief.
 * Throws a StoreError when the World does not exist (404), is not in draft
 * (409), or its Brief does not pass the §7.1 rules (422).
 */
export function claimSetup(db: Db, worldId: string): World {
  return db.transaction((tx) => {
    const world = getWorld(tx, worldId)
    const conflict = setupConflict(world)
    if (conflict) throw new StoreError("conflict", conflict)
    if (!world.brief) {
      throw new StoreError(
        "invalid",
        "The saved Brief has problems, so setup cannot start. Fix the problems listed under Checks, then run setup again."
      )
    }
    return updateWorld(tx, {
      ...world,
      setupStatus: "drafting",
      updatedAt: nowIso(),
    })
  })
}

/** Returns a World that is still `drafting` to `draft`. Nothing else changes. */
function releaseSetup(db: Db, worldId: string) {
  db.transaction((tx) => {
    const world = findWorld(tx, worldId)
    if (world?.setupStatus !== "drafting") return
    updateWorld(tx, { ...world, setupStatus: "draft", updatedAt: nowIso() })
  })
}

export type SetupModels = { drafter: Drafter; judge: Judge }

export type SetupStream = {
  emit: (event: SetupEvent) => void
  /** Milliseconds since the stream started. */
  elapsed: () => number
  /** Aborts when the Author leaves. */
  signal: AbortSignal
}

/** A step that failed: which step, the stream's error code and the Author's message. */
class StepFailure extends Error {
  constructor(
    readonly step: SetupStep,
    readonly code: StreamErrorCode,
    message: string,
    readonly gaps: SolvabilityGap[] = []
  ) {
    super(message)
  }
}

/** A model error's own words, short enough for the setup panel. */
function reason(error: unknown) {
  const text = error instanceof Error ? error.message : String(error)
  const line = text.split("\n")[0].trim()
  return line.length > 200 ? `${line.slice(0, 197)}...` : line
}

/**
 * Runs setup on a World `claimSetup` returned, streaming progress. Never
 * throws: every outcome ends the stream with one `result` or one `error`
 * event (none when the Author has left), and every outcome but success
 * returns the World to `draft`.
 */
export async function runSetup(
  deps: SetupModels & { db: Db },
  world: World,
  stream: SetupStream,
  options: { log?: (line: string) => void } = {}
): Promise<void> {
  const { db, drafter, judge } = deps
  const { emit, elapsed, signal } = stream
  const log = options.log ?? ((line: string) => console.info(line))
  const brief = world.brief
  let stored = false

  const step = (
    name: SetupStep,
    status: "started" | "done" | "failed",
    attempt: number,
    maxAttempts: number,
    detail: string | null = null
  ) =>
    emit({
      type: "step",
      step: name,
      status,
      attempt,
      maxAttempts,
      detail,
      at: elapsed(),
    })

  /** Runs one step's model call; on failure, marks the step failed and throws a StepFailure. */
  async function modelStep<T>(
    name: SetupStep,
    attempt: [number, number],
    failure: { code: StreamErrorCode; what: string },
    call: () => Promise<T>
  ): Promise<T> {
    try {
      return await call()
    } catch (error) {
      if (signal.aborted) throw error
      log(`[setup] world=${world.id} ${name} failed: ${String(error)}`)
      step(name, "failed", ...attempt)
      throw new StepFailure(
        name,
        failure.code,
        `${failure.what}: ${reason(error)} Try again.`
      )
    }
  }

  try {
    if (!brief) throw new Error("setup ran on a World without a Brief")
    const context: NewEntryContext = {
      worldId: world.id,
      now: nowIso(),
      newId: () => newId("entry"),
    }

    // 1. Parse.
    step("parse", "started", 1, 1)
    const author = authorEntries(brief, context)
    step("parse", "done", 1, 1, parseSummary(brief))

    // 2. World call.
    step("world_call", "started", 1, 1)
    const worldDraft = await modelStep(
      "world_call",
      [1, 1],
      { code: "drafter_error", what: "The Drafter could not draft the World" },
      () => drafter.draft(worldCallRequest(brief, author), { signal })
    )
    const worldResolved = resolveWorldDraft(worldDraft.output, {
      brief,
      authorEntries: author,
      context,
    })
    for (const note of worldResolved.notes)
      log(`[setup] world=${world.id} world_call: ${note}`)
    const codex = [...author, ...worldResolved.entries]
    // No Story logic retry can add a start Location, so fail now.
    const noStart = checkSolvability({
      arcs: brief.arcs,
      entries: codex,
    }).gaps.find((gap) => gap.code === "no_start_location")
    if (noStart) {
      log(`[setup] world=${world.id} world_call: ${noStart.message}`)
      step("world_call", "failed", 1, 1, "no start Location")
      throw new StepFailure(
        "world_call",
        "solvability_failed",
        "The World call left the World without a start Location, and the Story logic call cannot add one, so setup stopped before it. Add a Location to the Brief (the first one is where the Player begins), then run setup again.",
        [noStart]
      )
    }
    step("world_call", "done", 1, 1, draftedSummary(worldResolved.entries))

    // 3. Story logic, validation and solvability, with retries.
    let worldChecked: Entry[] | null = null
    let retry: { previous: StoryLogicDraft; gaps: SolvabilityGap[] } | null =
      null
    let entries: Entry[] | null = null
    for (let attempt = 1; attempt <= MAX_STORY_LOGIC_ATTEMPTS; attempt++) {
      const max = MAX_STORY_LOGIC_ATTEMPTS
      step(
        "story_logic_call",
        "started",
        attempt,
        max,
        retry ? `fixing ${plural(retry.gaps.length, "gap")}` : null
      )
      const storyDraft = await modelStep(
        "story_logic_call",
        [attempt, max],
        {
          code: "drafter_error",
          what: "The Drafter could not draft the story logic",
        },
        () =>
          drafter.draft(storyLogicCallRequest(brief, codex, retry), { signal })
      )
      const story = resolveStoryLogicDraft(storyDraft.output, {
        brief,
        codex,
        context,
      })
      step(
        "story_logic_call",
        "done",
        attempt,
        max,
        draftedSummary(story.entries)
      )

      step("validate", "started", attempt, max)
      const toCheck: Entry[] = [
        ...(worldChecked ? [] : worldResolved.entries),
        ...story.entries,
      ]
      const checked: { entries: Entry[] } = await modelStep(
        "validate",
        [attempt, max],
        {
          code: "judge_outage",
          what: "The Judge could not check the drafted Entries",
        },
        () =>
          validateEntries(
            judge,
            { brief, entries: toCheck, codex: [...codex, ...story.entries] },
            { signal }
          )
      )
      worldChecked ??= checked.entries.slice(0, worldResolved.entries.length)
      const storyChecked = checked.entries.slice(
        checked.entries.length - story.entries.length
      )
      step("validate", "done", attempt, max, judgeSummary(checked.entries))

      step("solvability", "started", attempt, max)
      const candidate = [...author, ...worldChecked, ...storyChecked]
      const check = checkSolvability({ arcs: brief.arcs, entries: candidate })
      const gaps = [...story.gaps, ...check.gaps]
      if (gaps.length === 0) {
        step("solvability", "done", attempt, max, "solvable")
        entries = candidate
        break
      }
      log(
        `[setup] world=${world.id} attempt ${attempt} of ${max}: ${gaps.map((g) => g.message).join(" | ")}`
      )
      step("solvability", "failed", attempt, max, plural(gaps.length, "gap"))
      emit({ type: "gaps", attempt, gaps, at: elapsed() })
      if (attempt === max) {
        throw new StepFailure(
          "solvability",
          "solvability_failed",
          lastAttemptMessage(gaps, max),
          gaps
        )
      }
      retry = { previous: storyDraft.output, gaps }
    }
    if (!entries) throw new Error("setup ended without Entries")
    const drafted = entries

    // 4. Store, unless the Author has left.
    signal.throwIfAborted()
    const result = db.transaction((tx) => {
      const current = getWorld(tx, world.id)
      if (current.setupStatus !== "drafting") {
        throw new StoreError(
          "conflict",
          "This World changed while setup ran. Reload it and run setup again."
        )
      }
      const saved = insertEntries(tx, drafted)
      const checkedAt = nowIso()
      const next = updateWorld(tx, {
        ...current,
        setupStatus: "review",
        solvability: { passed: true, gaps: [], checkedAt },
        updatedAt: checkedAt,
      })
      return { world: next, entries: saved }
    })
    stored = true
    emit({ type: "result", ...result, at: elapsed() })
  } catch (error) {
    if (signal.aborted) {
      log(`[setup] world=${world.id} stopped: the Author left`)
      return
    }
    if (error instanceof StepFailure) {
      emit({
        type: "error",
        code: error.code,
        message: error.message,
        step: error.step,
        ...(error.gaps.length > 0 ? { gaps: error.gaps } : {}),
        at: elapsed(),
      })
      return
    }
    log(
      `[setup] world=${world.id} failed: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`
    )
    emit({
      type: "error",
      code: error instanceof StoreError ? "conflict" : "internal",
      message:
        error instanceof StoreError
          ? error.message
          : "Setup stopped unexpectedly. Try again.",
      at: elapsed(),
    })
  } finally {
    if (!stored) releaseSetup(db, world.id)
  }
}
