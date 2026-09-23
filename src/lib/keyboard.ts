"use client"

/**
 * Single-key shortcuts that never fire while the person is typing (UX bar:
 * `d` toggles the theme; page tickets add their own, e.g. `a` / `r` in the
 * setup review). Show each shortcut with `Kbd` in its control's tooltip.
 */
import * as React from "react"

/** True for inputs, textareas, selects and anything content-editable (the editors). */
export function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  )
}

/** Keys already taken app-wide. */
export const RESERVED_SHORTCUT_KEYS = ["d"] as const

/**
 * Calls `handler` when `key` is pressed without modifiers, outside any typing
 * target, unless another handler already prevented the event.
 */
export function useSingleKeyShortcut(key: string, handler: (event: KeyboardEvent) => void, options: { enabled?: boolean } = {}) {
  const enabled = options.enabled ?? true
  const handlerRef = React.useRef(handler)
  React.useEffect(() => {
    handlerRef.current = handler
  })

  React.useEffect(() => {
    if (!enabled) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key.toLowerCase() !== key.toLowerCase()) return
      if (isTypingTarget(event.target)) return
      handlerRef.current(event)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [key, enabled])
}
