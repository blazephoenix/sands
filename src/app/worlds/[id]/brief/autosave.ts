/**
 * Debounced autosave with one request in flight at a time, retry with backoff,
 * and a status that tells the truth (docs/design/ux-bar.md: nothing typed is ever lost).
 *
 * - `change()` after every edit: the latest snapshot is saved `debounceMs` later.
 * - Edits made while a save is in flight are saved right after it.
 * - A failed save keeps retrying (2 s, 4 s, 8 s, then every 15 s) while the
 *   failure is retryable; the status says "not saved" until one succeeds.
 * - `flush()` saves now and resolves true once everything is saved (Cmd/Ctrl+S,
 *   before setup, before leaving).
 *
 * Framework-free so it can be tested with fake timers; the Brief page drives it.
 */

export type SaveStatus =
  | { kind: "saved"; at: number | null }
  /** Changes waiting for the debounce, or being saved. */
  | { kind: "saving" }
  /** The last save failed. `retrying` when another attempt is scheduled or running. */
  | { kind: "error"; message: string; retrying: boolean }

export type AutosaveOptions<T> = {
  snapshot: () => T
  save: (snapshot: T) => Promise<void>
  debounceMs?: number
  retryDelaysMs?: number[]
  isRetryable?: (error: unknown) => boolean
  messageOf?: (error: unknown) => string
  now?: () => number
}

export const DEFAULT_RETRY_DELAYS_MS = [2_000, 4_000, 8_000, 15_000]

export class Autosave<T> {
  private version = 0
  private savedVersion = 0
  private inFlight: Promise<void> | null = null
  private lastError: unknown = null
  private timer: ReturnType<typeof setTimeout> | null = null
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private retryIndex = 0
  private status: SaveStatus = { kind: "saved", at: null }
  private listeners = new Set<() => void>()
  private active = true

  constructor(private readonly options: AutosaveOptions<T>) {}

  get dirty() {
    return this.version !== this.savedVersion
  }

  get saving() {
    return this.inFlight !== null
  }

  getStatus = (): SaveStatus => this.status

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** Record an edit; the latest snapshot is saved after the debounce. */
  change() {
    this.version++
    if (this.status.kind !== "error") this.setStatus({ kind: "saving" })
    this.schedule(this.options.debounceMs ?? 800)
  }

  /** Save now. Resolves true when every change is saved, false if a save failed (retries continue). */
  async flush(): Promise<boolean> {
    if (!this.active) return !this.dirty
    this.clearTimers()
    for (let guard = 0; guard < 20; guard++) {
      if (this.inFlight) {
        await this.inFlight
        continue
      }
      if (!this.dirty) {
        if (this.status.kind !== "saved")
          this.setStatus({ kind: "saved", at: this.now() })
        return true
      }
      await this.run()
      if (this.lastError) return false
    }
    return !this.dirty
  }

  /** Stops scheduled saves and retries (the page is going away); pending changes stay `dirty`. */
  stop() {
    this.active = false
    this.clearTimers()
  }

  /** Resumes after `stop()` (React may unmount and remount the same page), saving anything pending. */
  start() {
    this.active = true
    if (this.dirty && !this.inFlight) this.schedule(0)
  }

  private now() {
    return (this.options.now ?? Date.now)()
  }

  private setStatus(status: SaveStatus) {
    this.status = status
    for (const listener of this.listeners) listener()
  }

  private clearTimers() {
    if (this.timer) clearTimeout(this.timer)
    if (this.retryTimer) clearTimeout(this.retryTimer)
    this.timer = null
    this.retryTimer = null
  }

  private schedule(ms: number) {
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      this.timer = null
      void this.run()
    }, ms)
  }

  private async run(): Promise<void> {
    if (!this.active) return
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    if (this.inFlight) {
      // The continuation of the save in flight picks up newer changes.
      await this.inFlight
      return
    }
    if (!this.dirty) {
      this.setStatus({ kind: "saved", at: this.now() })
      return
    }

    const version = this.version
    const snapshot = this.options.snapshot()
    if (this.status.kind === "error")
      this.setStatus({ ...this.status, retrying: true })
    else this.setStatus({ kind: "saving" })

    this.lastError = null
    this.inFlight = this.options.save(snapshot).then(
      () => {
        this.savedVersion = Math.max(this.savedVersion, version)
        this.retryIndex = 0
      },
      (error: unknown) => {
        this.lastError = error
      }
    )
    await this.inFlight
    this.inFlight = null
    if (!this.active) return

    if (this.lastError) {
      const retryable = this.options.isRetryable?.(this.lastError) ?? true
      const message =
        this.options.messageOf?.(this.lastError) ??
        "The server did not save the Brief."
      this.setStatus({ kind: "error", message, retrying: retryable })
      if (retryable) {
        const delays = this.options.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS
        const delay = delays[Math.min(this.retryIndex, delays.length - 1)]
        this.retryIndex++
        if (this.retryTimer) clearTimeout(this.retryTimer)
        this.retryTimer = setTimeout(() => {
          this.retryTimer = null
          void this.run()
        }, delay)
      }
      return
    }

    if (this.retryTimer) {
      clearTimeout(this.retryTimer)
      this.retryTimer = null
    }
    if (this.dirty) {
      // Edits arrived while saving: keep "Saving…" and save them next.
      this.setStatus({ kind: "saving" })
      this.schedule(this.options.debounceMs ?? 800)
    } else {
      this.setStatus({ kind: "saved", at: this.now() })
    }
  }
}
