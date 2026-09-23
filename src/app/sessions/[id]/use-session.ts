"use client"

/**
 * The Session page's data and play state: loads `GET /api/sessions/[id]`,
 * polls it while background work is pending, and plays Turns through
 * `POST /api/sessions/[id]/turn`, tracking its progress events.
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

export type TurnRun =
  | { status: "idle" }
  | { status: "running"; input: string; phase: TurnPhase | null; round: number | null }
  | { status: "failed"; input: string; code: string; message: string }

/** How often to ask whether background work has finished. */
const POLL_MS = 1500

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

  React.useEffect(() => {
    const controller = new AbortController()
    fetchSession(sessionId, controller.signal)
      .then((data) => setLoad({ status: "ready", data }))
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

  /** Plays one Turn. Resolves to the Turn when a Passage shipped, else null. */
  const playTurn = React.useCallback(
    async (input: string): Promise<Turn | null> => {
      turnAbort.current?.abort()
      const controller = new AbortController()
      turnAbort.current = controller
      setRevealing(null)
      setRun({ status: "running", input, phase: null, round: null })
      try {
        for await (const event of api.streamTurn(sessionId, { input }, { signal: controller.signal })) {
          if (event.type === "phase") {
            setRun({ status: "running", input, phase: event.phase, round: event.round })
          } else if (event.type === "error") {
            setRun({ status: "failed", input, code: event.code, message: event.message })
            return null
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
            return turn
          }
        }
        return null
      } catch (error) {
        if (isAbortError(error)) return null
        const apiError = asApiError(error)
        setRun({ status: "failed", input, code: apiError.code, message: apiError.message })
        return null
      }
    },
    [sessionId, update, refresh]
  )

  const finishReveal = React.useCallback(() => setRevealing(null), [])

  return { load, retryLoad, run, playTurn, revealing, finishReveal, backgroundPending, update, refresh, localEntries }
}

export function mergeEntries(current: readonly Entry[], changed: readonly Entry[]): Entry[] {
  if (changed.length === 0) return [...current]
  const byId = new Map(changed.map((entry) => [entry.id, entry]))
  const merged = current.map((entry) => byId.get(entry.id) ?? entry)
  const known = new Set(current.map((entry) => entry.id))
  return [...merged, ...changed.filter((entry) => !known.has(entry.id))]
}
