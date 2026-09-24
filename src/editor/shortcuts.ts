/**
 * Editor keyboard shortcuts, in one place so tooltips can show them with `Kbd`.
 * ProseMirror key names (`Mod` is Cmd on macOS, Ctrl elsewhere).
 *
 * Pages: do not bind these combinations to page actions.
 */
export const EDITOR_SHORTCUTS = {
  /** Toggle the Hidden style on the selected text (also the eye button in the formatting toolbar). */
  toggleHidden: "Mod-Shift-h",
  /** Open the block menu for the block holding the cursor: the keyboard route to the ⠿ menu. */
  blockMenu: "Mod-/",
  /** Move the section (or block) holding the cursor up or down: the keyboard alternative to dragging. */
  moveUp: "Shift-Mod-ArrowUp",
  moveDown: "Shift-Mod-ArrowDown",
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
export function shortcutKeys(
  shortcut: string,
  mac = isMacPlatform()
): string[] {
  return shortcut.split("-").map((part) => {
    if (part === "Mod") return mac ? "⌘" : "Ctrl"
    if (part === "Shift") return mac ? "⇧" : "Shift"
    if (part === "Alt") return mac ? "⌥" : "Alt"
    return KEY_LABELS[part] ?? part.toUpperCase()
  })
}
