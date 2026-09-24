"use client"

/**
 * The app shell: a header with the app name, the page's breadcrumbs and
 * actions (see ./shell-slots) and the theme toggle.
 */
import Link from "next/link"

import { Separator } from "@/components/ui/separator"

import { ShellSlotsProvider, useShellSlots } from "./shell-slots"
import { ThemeToggle } from "./theme-toggle"

function Header() {
  const { setBreadcrumbs, setActions } = useShellSlots()
  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center gap-3 px-4">
        <Link
          href="/"
          className="shrink-0 rounded-md font-heading font-semibold tracking-tight outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Sands
        </Link>
        <Separator
          orientation="vertical"
          className="data-vertical:h-5 data-vertical:self-center"
        />
        <div
          ref={setBreadcrumbs}
          className="flex min-w-0 flex-1 items-center"
        />
        <div ref={setActions} className="flex shrink-0 items-center gap-2" />
        <ThemeToggle />
      </div>
    </header>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ShellSlotsProvider>
      <a
        href="#main"
        className="sr-only rounded-md bg-background px-3 py-2 text-sm focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:ring-3 focus:ring-ring/50"
      >
        Skip to content
      </a>
      <div className="flex min-h-svh flex-col">
        <Header />
        <main
          id="main"
          tabIndex={-1}
          className="flex flex-1 flex-col outline-none"
        >
          {children}
        </main>
      </div>
    </ShellSlotsProvider>
  )
}
