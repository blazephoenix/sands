/**
 * Editor keyboard shortcuts, in one place so tooltips can show them with `Kbd`.
 * ProseMirror key names (`Mod` is Cmd on macOS, Ctrl elsewhere).
 *
 * Page tickets: do not bind these combinations to page actions.
 */
export const EDITOR_SHORTCUTS = {
  /** Toggle Hidden on the field holding the cursor. */
  toggleHidden: "Mod-Shift-h",
  /** Add a custom field after the one holding the cursor, and focus its label. */
  addField: "Mod-Shift-Enter",
  /** Move the current block up or down: the keyboard alternative to dragging (BlockNote built-in). */
  moveUp: "Shift-Mod-ArrowUp",
  moveDown: "Shift-Mod-ArrowDown",
  /** Next and previous field (inside typed and Entry blocks). */
  nextField: "Tab",
  previousField: "Shift-Tab",
} as const

export type EditorShortcut = keyof typeof EDITOR_SHORTCUTS

export function isMacPlatform() {
  if (typeof navigator === "undefined") return false
  return /Mac|iPhone|iPad/u.test(navigator.platform || navigator.userAgent)
}

const KEY_LABELS: Record<string, string> = {
  ArrowUp: "↑",
  ArrowDown: "↓",
  Enter: "Enter",
  Tab: "Tab",
}

/** Splits a ProseMirror key name into display keys, e.g. "Mod-Shift-h" -> ["Ctrl", "Shift", "H"]. */
export function shortcutKeys(shortcut: string, mac = isMacPlatform()): string[] {
  return shortcut.split("-").map((part) => {
    if (part === "Mod") return mac ? "⌘" : "Ctrl"
    if (part === "Shift") return mac ? "⇧" : "Shift"
    if (part === "Alt") return mac ? "⌥" : "Alt"
    return KEY_LABELS[part] ?? part.toUpperCase()
  })
}
