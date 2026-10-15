/**
 * Showing keyboard shortcuts. ProseMirror-style key names (`Mod` is Cmd on
 * macOS, Ctrl elsewhere); single keys work too.
 */

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

/** Splits a key name into display keys, e.g. "Mod-Shift-h" -> ["Ctrl", "Shift", "H"]. */
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
