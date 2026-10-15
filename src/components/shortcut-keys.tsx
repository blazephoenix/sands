"use client"

import * as React from "react"

import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { isMacPlatform, shortcutKeys } from "@/lib/shortcuts"

const subscribe = () => () => {}

/** True on macOS, false on the server and elsewhere. */
export function useIsMac() {
  return React.useSyncExternalStore(subscribe, isMacPlatform, () => false)
}

/**
 * Shows a shortcut with `Kbd`, e.g. `<ShortcutKeys shortcut="Mod-Shift-h" />`.
 * Takes ProseMirror-style names; single keys work too (`"d"`).
 */
export function ShortcutKeys({ shortcut }: { shortcut: string }) {
  const mac = useIsMac()
  const keys = shortcutKeys(shortcut, mac)
  if (keys.length === 1) return <Kbd>{keys[0]}</Kbd>
  return (
    <KbdGroup>
      {keys.map((key) => (
        <Kbd key={key}>{key}</Kbd>
      ))}
    </KbdGroup>
  )
}
