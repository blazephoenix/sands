import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { Autosave } from "./autosave"

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})

function setup(save: (value: number) => Promise<void>) {
  let value = 0
  const autosave = new Autosave<number>({
    snapshot: () => value,
    save,
    debounceMs: 800,
    retryDelaysMs: [2000, 4000],
    isRetryable: (error) => error !== "fatal",
    messageOf: (error) => `failed: ${String(error)}`,
  })
  const edit = (next: number) => {
    value = next
    autosave.change()
  }
  return { autosave, edit }
}

describe("autosave", () => {
  it("debounces edits into one save of the latest snapshot", async () => {
    const saved: number[] = []
    const { autosave, edit } = setup(async (v) => void saved.push(v))
    edit(1)
    edit(2)
    expect(autosave.getStatus().kind).toBe("saving")
    await vi.advanceTimersByTimeAsync(799)
    expect(saved).toEqual([])
    await vi.advanceTimersByTimeAsync(1)
    expect(saved).toEqual([2])
    expect(autosave.getStatus().kind).toBe("saved")
    expect(autosave.dirty).toBe(false)
  })

  it("saves edits made during a save right after it, never two at once", async () => {
    const calls: number[] = []
    let inFlight = 0
    let maxInFlight = 0
    const { autosave, edit } = setup(async (v) => {
      inFlight++
      maxInFlight = Math.max(maxInFlight, inFlight)
      calls.push(v)
      await new Promise((resolve) => setTimeout(resolve, 1000))
      inFlight--
    })
    edit(1)
    await vi.advanceTimersByTimeAsync(800)
    edit(2)
    await vi.advanceTimersByTimeAsync(800)
    await vi.advanceTimersByTimeAsync(3000)
    expect(calls).toEqual([1, 2])
    expect(maxInFlight).toBe(1)
    expect(autosave.getStatus().kind).toBe("saved")
  })

  it("says Not saved while failing, keeps retrying, and recovers", async () => {
    let fail = true
    const saved: number[] = []
    const { autosave, edit } = setup(async (v) => {
      if (fail) throw "offline"
      saved.push(v)
    })
    edit(1)
    await vi.advanceTimersByTimeAsync(800)
    expect(autosave.getStatus()).toEqual({ kind: "error", message: "failed: offline", retrying: true })
    expect(autosave.dirty).toBe(true)
    await vi.advanceTimersByTimeAsync(2000)
    expect(autosave.getStatus().kind).toBe("error")
    fail = false
    await vi.advanceTimersByTimeAsync(4000)
    expect(saved).toEqual([1])
    expect(autosave.getStatus().kind).toBe("saved")
  })

  it("stops retrying a failure that retrying cannot fix", async () => {
    const save = vi.fn(async () => {
      throw "fatal"
    })
    const { autosave, edit } = setup(save)
    edit(1)
    await vi.advanceTimersByTimeAsync(800)
    await vi.advanceTimersByTimeAsync(20_000)
    expect(save).toHaveBeenCalledTimes(1)
    expect(autosave.getStatus()).toMatchObject({ kind: "error", retrying: false })
  })

  it("flush saves now and reports whether everything is saved", async () => {
    const saved: number[] = []
    const { autosave, edit } = setup(async (v) => void saved.push(v))
    edit(5)
    await expect(autosave.flush()).resolves.toBe(true)
    expect(saved).toEqual([5])
    await expect(autosave.flush()).resolves.toBe(true)
    expect(saved).toEqual([5])
  })

  it("flush reports a failed save", async () => {
    const { autosave, edit } = setup(async () => {
      throw "offline"
    })
    edit(1)
    await expect(autosave.flush()).resolves.toBe(false)
    expect(autosave.dirty).toBe(true)
  })

  it("stop cancels scheduled saves; start picks them up again", async () => {
    const saved: number[] = []
    const { autosave, edit } = setup(async (v) => void saved.push(v))
    edit(1)
    autosave.stop()
    await vi.advanceTimersByTimeAsync(5000)
    expect(saved).toEqual([])
    autosave.start()
    await vi.advanceTimersByTimeAsync(0)
    expect(saved).toEqual([1])
  })
})
