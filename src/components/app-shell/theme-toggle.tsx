"use client"

import { MoonIcon, SunIcon } from "lucide-react"

import { useToggleTheme } from "@/components/theme-provider"
import { ShortcutKeys } from "@/components/shortcut-keys"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

/** Light / dark switch. The icons swap with CSS, so server and client render the same markup. */
export function ThemeToggle() {
  const toggle = useToggleTheme()
  return (
    <Tooltip>
      <TooltipTrigger render={<Button variant="ghost" size="icon" aria-label="Toggle light or dark theme" onClick={toggle} />}>
        <SunIcon className="hidden dark:block" aria-hidden />
        <MoonIcon className="dark:hidden" aria-hidden />
      </TooltipTrigger>
      <TooltipContent>
        Toggle theme
        <ShortcutKeys shortcut="d" />
      </TooltipContent>
    </Tooltip>
  )
}
