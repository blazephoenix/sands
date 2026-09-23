"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"

import { useSingleKeyShortcut } from "@/lib/keyboard"

function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      // The theme script must run from the server HTML. When React renders it
      // on the client it cannot run anyway, and React warns about executable
      // script tags; a data-block type there silences that without changing
      // behaviour (the type attribute is covered by suppressHydrationWarning).
      scriptProps={{ type: typeof window === "undefined" ? "text/javascript" : "application/json" }}
      {...props}
    >
      <ThemeHotkey />
      {children}
    </NextThemesProvider>
  )
}

function ThemeHotkey() {
  const toggle = useToggleTheme()
  useSingleKeyShortcut("d", toggle)
  return null
}

/** Switches between light and dark from whatever is showing now. */
function useToggleTheme() {
  const { resolvedTheme, setTheme } = useTheme()
  return React.useCallback(() => setTheme(resolvedTheme === "dark" ? "light" : "dark"), [resolvedTheme, setTheme])
}

export { ThemeProvider, useToggleTheme }
