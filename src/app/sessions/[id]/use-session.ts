"use client"

/**
 * The Session page's data and play state: loads `GET /api/sessions/[id]`,
 * polls it while background work is pending, and plays Turns through
 * `POST /api/sessions/[id]/turn`, tracking its progress events.
 *
 * A Session with no Turns plays its Opening (spec §9.0) as soon as it loads.
 * Nothing is saved until a Passage ships, so a reload mid-Opening simply
 * starts it again. The route answers 409 when another request is writing the
 * Opening (a second tab, a reload racing its own abort) or has shipped it;
 * the page then loads the Session and, while it still has no Turns, waits
 * and asks again, so it never writes a second Opening.
 */
import * as React from "react"

import type { Entry } from "@/domain/entry"
import type { TurnPhase } from "@/domain/events"
import type { Turn } from "@/domain/session"
import type { GetSessionResponse } from "@/domain/session-view"
import { api, ApiError, isAbortError } from "@/lib/api-client"

export function fetchSession(id: string, signal?: AbortSignal) {
  return api.getSession(id, signal)
}

export type SessionLoad =
  | { status: "loading" }
  | { status: "error"; error: ApiError }
  | { status: "ready"; data: GetSessionResponse }

/** `input` is the Player's action, or null for the Opening. */
export type TurnRun =
  | { status: "idle" }
  | { status: "running"; input: string | null; phase: TurnPhase | null; round: number | null }
  | { status: "failed"; input: string | null; code: string; message: string }

/** How often to ask whether background work has finished. */
const POLL_MS = 1500

/** How long to wait before asking again for an Opening someone else is writing. */
const OPENING_WAIT_MS = 1500

/** Waits, unless aborted first. Resolves false when aborted. */
function wait(ms: number, signal: AbortSignal) {
  return new Promise<boolean>((resolve) => {
    if (signal.aborted) return resolve(false)
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort)
      resolve(true)
    }, ms)
    function onAbort() {
      clearTimeout(timer)
      resolve(false)
    }
    signal.addEventListener("abort", onAbort, { once: true })
  })
}

/** How one Turn request ended. */
type StreamEnd = { kind: "shipped"; turn: Turn } | { kind: "failed" } | { kind: "aborted" } | { kind: "conflict"; error: ApiError }

function asApiError(error: unknown) {
  return error instanceof ApiError ? error : new ApiError(0, "internal", "Something went wrong on this page. Try again.")
}

export function useSession(sessionId: string) {
  const [load, setLoad] = React.useState<SessionLoad>({ status: "loading" })
  const [attempt, setAttempt] = React.useState(0)
  const [run, setRun] = React.useState<TurnRun>({ status: "idle" })
  /** The Turn whose Passage is revealing now. */
  const [revealing, setRevealing] = React.useState<string | null>(null)

  /** Bumped by every local change, so a poll that started earlier cannot overwrite it. */
  const version = React.useRef(0)
  /** Entries with a save in flight in the Codex: the page's copy wins over a poll's. */
  const localEntries = React.useRef(new Set<string>())
  const turnAbort = React.useRef<AbortController | null>(null)

  /** The latest `playOpening`, for the load below to start it. */
  const startOpening = React.useRef<() => Promise<void>>(async () => {})

  React.useEffect(() => {
    const controller = new AbortController()
    fetchSession(sessionId, controller.signal)
      .then((data) => {
        setLoad({ status: "ready", data })
        // A Session never starts blank: loaded with no Turns, its Opening plays by itself.
        // A doubled mount aborts the first load, so only one load gets here; the route's
        // claim and the 409 loop keep a fast reload or a second tab from writing another.
        if (data.turns.length === 0 && data.session.ending === "none") void startOpening.current()
      })
      .catch((error: unknown) => {
        if (isAbortError(error)) return
        setLoad({ status: "error", error: asApiError(error) })
      })
    return () => controller.abort()
  }, [sessionId, attempt])

  React.useEffect(() => {
    return () => turnAbort.current?.abort()
  }, [])

  const retryLoad = React.useCallback(() => {
    setLoad({ status: "loading" })
    setAttempt((n) => n + 1)
  }, [])

  const update = React.useCallback((change: (data: GetSessionResponse) => GetSessionResponse) => {
    version.current += 1
    setLoad((current) => (current.status === "ready" ? { status: "ready", data: change(current.data) } : current))
  }, [])

  /** Fetches the Session again without a loading state, keeping local Codex edits. */
  const refresh = React.useCallback(
    async (signal?: AbortSignal) => {
      const started = version.current
      const data = await fetchSession(sessionId, signal)
      if (version.current !== started) return
      setLoad((current) => {
        if (current.status !== "ready") return { status: "ready", data }
        const local = new Map(current.data.entries.filter((entry) => localEntries.current.has(entry.id)).map((entry) => [entry.id, entry]))
        return { status: "ready", data: { ...data, entries: data.entries.map((entry) => local.get(entry.id) ?? entry) } }
      })
    },
    [sessionId]
  )

  const backgroundPending = load.status === "ready" && load.data.turns.some((turn) => turn.backgroundStatus === "pending")

  // Poll while background work runs; results land in the harness log and the Codex.
  React.useEffect(() => {
    if (!backgroundPending) return
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      timer = setTimeout(() => {
        refresh(controller.signal)
          .catch(() => {
            // A failed poll is retried on the next tick; the page keeps what it has.
          })
          .finally(() => {
            if (!controller.signal.aborted) tick()
          })
      }, POLL_MS)
    }
    tick()
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [backgroundPending, refresh])

  /**
   * Streams one Turn request (the Opening when `input` is null), tracking its
   * progress, and applies the shipped Turn. A 409 is handed back to the
   * caller; every other failure is recorded in `run`.
   */
  const streamTurn = React.useCallback(
    async (input: string | null, signal: AbortSignal): Promise<StreamEnd> => {
      setRun({ status: "running", input, phase: null, round: null })
      try {
        for await (const event of api.streamTurn(sessionId, { input }, { signal })) {
          if (event.type === "phase") {
            setRun({ status: "running", input, phase: event.phase, round: event.round })
          } else if (event.type === "error") {
            setRun({ status: "failed", input, code: event.code, message: event.message })
            return { kind: "failed" }
          } else {
            const { turn, session, entries } = event
            update((data) => ({
              ...data,
              session,
              turns: [...data.turns.filter((t) => t.id !== turn.id), turn],
              entries: mergeEntries(data.entries, entries),
            }))
            setRevealing(turn.id)
            setRun({ status: "idle" })
            // The Turn may have waited for earlier background work: pick up its results.
            refresh().catch(() => {})
            return { kind: "shipped", turn }
          }
        }
        return { kind: "aborted" }
      } catch (error) {
        if (isAbortError(error)) return { kind: "aborted" }
        const apiError = asApiError(error)
        if (apiError.status === 409) return { kind: "conflict", error: apiError }
        setRun({ status: "failed", input, code: apiError.code, message: apiError.message })
        return { kind: "failed" }
      }
    },
    [sessionId, update, refresh]
  )

  /** A new request for the page's one Turn in flight; any earlier one is cancelled. */
  const beginRequest = React.useCallback(() => {
    turnAbort.current?.abort()
    const controller = new AbortController()
    turnAbort.current = controller
    setRevealing(null)
    return controller
  }, [])

  /** Plays one Turn. Resolves to the Turn when a Passage shipped, else null. */
  const playTurn = React.useCallback(
    async (input: string): Promise<Turn | null> => {
      const controller = beginRequest()
      const end = await streamTurn(input, controller.signal)
      if (end.kind === "conflict") setRun({ status: "failed", input, code: end.error.code, message: end.error.message })
      return end.kind === "shipped" ? end.turn : null
    },
    [beginRequest, streamTurn]
  )

  /**
   * Plays the Opening. On 409 someone else is writing it or has shipped it:
   * load the Session, and while it still has no Turns, wait and ask again.
   */
  const playOpening = React.useCallback(async () => {
    const controller = beginRequest()
    const { signal } = controller
    while (!signal.aborted) {
      const end = await streamTurn(null, signal)
      if (end.kind !== "conflict") return
      setRun({ status: "running", input: null, phase: null, round: null })
      try {
        const data = await fetchSession(sessionId, signal)
        if (data.turns.length > 0 || data.session.ending !== "none") {
          version.current += 1
          setLoad({ status: "ready", data })
          setRun({ status: "idle" })
          return
        }
      } catch (error) {
        if (isAbortError(error)) return
        // Could not look; the next attempt tries again.
      }
      if (!(await wait(OPENING_WAIT_MS, signal))) return
    }
  }, [beginRequest, sessionId, streamTurn])

  React.useEffect(() => {
    startOpening.current = playOpening
  }, [playOpening])

  const finishReveal = React.useCallback(() => setRevealing(null), [])

  return { load, retryLoad, run, playTurn, playOpening, revealing, finishReveal, backgroundPending, update, refresh, localEntries }
}

export function mergeEntries(current: readonly Entry[], changed: readonly Entry[]): Entry[] {
  if (changed.length === 0) return [...current]
  const byId = new Map(changed.map((entry) => [entry.id, entry]))
  const merged = current.map((entry) => byId.get(entry.id) ?? entry)
  const known = new Set(current.map((entry) => entry.id))
  return [...merged, ...changed.filter((entry) => !known.has(entry.id))]
}
