"use client"

/**
 * The setup review's client state: the World's Entries and its solvability,
 * changed optimistically through `PATCH /api/entries/[id]`.
 *
 * - Every status change shows at once and is sent in the background. The
 *   response carries the Entry as stored and the World's fresh solvability
 *   (spec §8 step 4), which the banner shows. A failed request rolls the Entry
 *   back and says why.
 * - Overlapping requests: only the latest request for an Entry may write it
 *   back or roll it back; solvability keeps the newest `checkedAt`.
 * - The UI says Approve / Remove / Restore; the data stays accepted /
 *   rejected (CONTEXT.md). The mapping lives here and in `src/setup/review.ts`.
 */
import * as React from "react"

import { toast } from "@/components/ui/toast"
import type { GetWorldResponse, PatchEntryRequest } from "@/domain/api"
import type { Entry, EntryContent, EntryStatus } from "@/domain/entry"
import type { SolvabilityResult } from "@/domain/world"
import { api, ApiError } from "@/lib/api-client"
import { reviewDecision } from "@/setup/review"

export type ReviewAction = "approve" | "remove" | "restore"

const WORDS: Record<ReviewAction, { done: string; verb: string }> = {
  approve: { done: "approved", verb: "approve" },
  remove: { done: "removed", verb: "remove" },
  restore: { done: "restored", verb: "restore" },
}

export function entryTitle(entry: Pick<Entry, "name">) {
  return entry.name.trim() || "Untitled Entry"
}

export function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : "Something went wrong. Try again."
}

function statusRequest(to: EntryStatus): PatchEntryRequest {
  if (to === "accepted") return { action: "accept" }
  if (to === "rejected") return { action: "reject" }
  if (to === "locked") throw new Error("A locked Entry cannot change.")
  return { action: "restore", status: to }
}

const UNDO_TIMEOUT_MS = 6000

export function useSetupReview(initial: GetWorldResponse, options: { select: (entryId: string) => void }) {
  const worldId = initial.world.id
  const [entries, setEntries] = React.useState<Entry[]>(initial.entries)
  const [solvability, setSolvability] = React.useState<SolvabilityResult | null>(initial.world.solvability)
  const [pending, setPending] = React.useState(0)
  const [approvingRest, setApprovingRest] = React.useState(false)
  const [announcement, setAnnouncement] = React.useState("")

  const entriesRef = React.useRef(entries)
  const versions = React.useRef(new Map<string, number>())
  /** The status an Entry had before it was removed, so Restore puts it back. */
  const beforeRemoval = React.useRef(new Map<string, EntryStatus>())
  const undoToast = React.useRef<string | null>(null)
  const selectRef = React.useRef(options.select)
  React.useEffect(() => {
    selectRef.current = options.select
  })

  const commit = React.useCallback((update: (all: Entry[]) => Entry[]) => {
    entriesRef.current = update(entriesRef.current)
    setEntries(entriesRef.current)
  }, [])

  const current = React.useCallback((id: string) => entriesRef.current.find((entry) => entry.id === id), [])

  const applySolvability = React.useCallback((next: SolvabilityResult | null) => {
    if (!next) return
    setSolvability((now) => (!now || next.checkedAt >= now.checkedAt ? next : now))
  }, [])

  /** Shows `optimistic` at once, sends the request, then keeps the stored Entry or rolls back. Throws on failure. */
  const send = React.useCallback(
    async (entry: Entry, request: PatchEntryRequest, optimistic: Entry) => {
      const version = (versions.current.get(entry.id) ?? 0) + 1
      versions.current.set(entry.id, version)
      const latest = () => versions.current.get(entry.id) === version
      commit((all) => all.map((e) => (e.id === entry.id ? optimistic : e)))
      setPending((n) => n + 1)
      try {
        const response = await api.patchEntry(entry.id, request)
        if (latest()) commit((all) => all.map((e) => (e.id === entry.id ? response.entry : e)))
        applySolvability(response.solvability)
        return response.entry
      } catch (error) {
        if (latest()) commit((all) => all.map((e) => (e.id === entry.id ? entry : e)))
        throw error
      } finally {
        setPending((n) => n - 1)
      }
    },
    [applySolvability, commit]
  )

  const setStatus = React.useCallback(
    (entry: Entry, to: EntryStatus) => send(entry, statusRequest(to), { ...entry, status: to } as Entry),
    [send]
  )

  const showUndo = React.useCallback((title: string, undo: () => void) => {
    if (undoToast.current) toast.close(undoToast.current)
    const id: string = toast.add({
      title,
      timeout: UNDO_TIMEOUT_MS,
      actionProps: {
        children: "Undo",
        onClick: () => {
          undo()
          toast.close(id)
        },
      },
      onClose: () => {
        if (undoToast.current === id) undoToast.current = null
      },
    })
    undoToast.current = id
  }, [])

  const showError = React.useCallback((title: string, error: unknown, after: string) => {
    toast.add({ title, description: `${errorMessage(error)} ${after}`.trim(), type: "error", priority: "high", timeout: 10_000 })
  }, [])

  /** Puts Entries back to the statuses they had, after an Undo. */
  const revert = React.useCallback(
    (previous: readonly { id: string; status: EntryStatus }[], what: string) => {
      const attempts = previous.flatMap(({ id, status }) => {
        const entry = current(id)
        return entry && entry.status !== status ? [setStatus(entry, status)] : []
      })
      if (previous.length === 1) selectRef.current(previous[0].id)
      setAnnouncement(`Undone: ${what}.`)
      void Promise.allSettled(attempts).then((results) => {
        const failed = results.find((result): result is PromiseRejectedResult => result.status === "rejected")
        if (failed) showError(`Couldn't undo: ${what}`, failed.reason, "Try again.")
      })
    },
    [current, setStatus, showError]
  )

  /** Approve, Remove or Restore one Entry. Returns false when there was nothing to do. */
  const decide = React.useCallback(
    (id: string, action: ReviewAction): boolean => {
      const entry = current(id)
      if (!entry || entry.status === "locked") return false
      const decision = reviewDecision(entry.status)
      let to: EntryStatus
      if (action === "approve") {
        if (decision === "approved") return false
        to = "accepted"
      } else if (action === "remove") {
        if (decision === "removed") return false
        beforeRemoval.current.set(id, entry.status)
        to = "rejected"
      } else {
        if (decision !== "removed") return false
        to = beforeRemoval.current.get(id) ?? "proposed"
      }
      const name = entryTitle(entry)
      const what = `${name} ${WORDS[action].done}`
      setAnnouncement(`${what}.`)
      showUndo(what, () => revert([{ id, status: entry.status }], what))
      setStatus(entry, to).catch((error: unknown) => {
        if (undoToast.current) toast.close(undoToast.current)
        setAnnouncement(`Couldn't ${WORDS[action].verb} ${name}. It's back as it was.`)
        showError(`Couldn't ${WORDS[action].verb} ${name}`, error, "It's back as it was.")
      })
      return true
    },
    [current, revert, setStatus, showError, showUndo]
  )

  /** "Approve the rest as drafted": every undecided Entry, with one Undo. */
  const approveRest = React.useCallback(async () => {
    const targets = entriesRef.current.filter((entry) => reviewDecision(entry.status) === "undecided")
    if (targets.length === 0) return
    setApprovingRest(true)
    const results = await Promise.allSettled(targets.map((entry) => setStatus(entry, "accepted")))
    setApprovingRest(false)
    const approved = targets.filter((_, index) => results[index].status === "fulfilled")
    const failure = results.find((result): result is PromiseRejectedResult => result.status === "rejected")
    const noun = (n: number) => `${n} ${n === 1 ? "Entry" : "Entries"}`
    if (approved.length > 0) {
      const what = `${noun(approved.length)} approved as drafted`
      setAnnouncement(`${what}.`)
      showUndo(what, () =>
        revert(
          approved.map((entry) => ({ id: entry.id, status: entry.status })),
          what
        )
      )
    }
    if (failure) {
      const failed = targets.length - approved.length
      setAnnouncement(`Couldn't approve ${noun(failed)}. They're back in To review.`)
      showError(`Couldn't approve ${noun(failed)}`, failure.reason, `${failed === 1 ? "It's" : "They're"} back in To review.`)
    }
  }, [revert, setStatus, showError, showUndo])

  /** Saves an edit made in the Entry editor; the Entry becomes `edited`. Throws on failure. */
  const saveEdit = React.useCallback(
    async (id: string, content: EntryContent) => {
      const entry = current(id)
      if (!entry || entry.status === "locked") return
      await send(entry, { action: "edit", content }, { ...entry, ...content, status: "edited" } as Entry)
    },
    [current, send]
  )

  const startSession = React.useCallback(async () => {
    const { session } = await api.createSession({ worldId })
    return session.id
  }, [worldId])

  return {
    entries,
    solvability,
    saving: pending > 0,
    approvingRest,
    announcement,
    decide,
    approveRest,
    saveEdit,
    startSession,
  }
}
