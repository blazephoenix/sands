"use client"

/**
 * Test mode: whether the harness pane is available. Remembered in
 * `localStorage`; every read and write is wrapped, so a blocked store (private
 * mode, a full quota, a sandboxed frame) only means it is not remembered.
 */
import * as React from "react"

const KEY = "sands:test-mode"
const CHANGE = "sands:test-mode-change"

/** The value for this tab when storage is unavailable. */
let memory = false

function read(): boolean {
  try {
    const stored = window.localStorage.getItem(KEY)
    return stored === null ? memory : stored === "on"
  } catch {
    return memory
  }
}

function write(on: boolean) {
  memory = on
  try {
    window.localStorage.setItem(KEY, on ? "on" : "off")
  } catch {
    // Not remembered across reloads; the switch still works for this page.
  }
  window.dispatchEvent(new Event(CHANGE))
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange)
  window.addEventListener(CHANGE, onChange)
  return () => {
    window.removeEventListener("storage", onChange)
    window.removeEventListener(CHANGE, onChange)
  }
}

export function useTestMode(): [boolean, (on: boolean) => void] {
  const on = React.useSyncExternalStore(subscribe, read, () => false)
  return [on, write]
}
