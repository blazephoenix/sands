"use client"

/**
 * Page-provided parts of the app header, so pages never edit the shell:
 *
 *   <ShellBreadcrumbs items={worldCrumbs(world, "Skeleton")} />
 *   <ShellActions>
 *     <Button>Start</Button>
 *   </ShellActions>
 *
 * Both render through portals into the header, so they keep the page's React
 * context (providers, state) and unmount with the page.
 */
import * as React from "react"
import { createPortal } from "react-dom"
import Link from "next/link"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { worldHref } from "@/components/worlds/world-links"
import { worldDisplayName } from "@/domain/world"

type Slots = {
  breadcrumbs: HTMLElement | null
  actions: HTMLElement | null
  setBreadcrumbs: (element: HTMLElement | null) => void
  setActions: (element: HTMLElement | null) => void
}

const ShellSlotsContext = React.createContext<Slots | null>(null)

export function ShellSlotsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [breadcrumbs, setBreadcrumbs] = React.useState<HTMLElement | null>(null)
  const [actions, setActions] = React.useState<HTMLElement | null>(null)
  const value = React.useMemo(
    () => ({ breadcrumbs, actions, setBreadcrumbs, setActions }),
    [breadcrumbs, actions]
  )
  return (
    <ShellSlotsContext.Provider value={value}>
      {children}
    </ShellSlotsContext.Provider>
  )
}

export function useShellSlots() {
  const slots = React.useContext(ShellSlotsContext)
  if (!slots)
    throw new Error("Shell slots are only available inside the app shell.")
  return slots
}

/** Header actions for the current page (e.g. New Session, the harness pane switch). */
export function ShellActions({ children }: { children: React.ReactNode }) {
  const { actions } = useShellSlots()
  return actions ? createPortal(children, actions) : null
}

export type Crumb = {
  label: string
  /** Omit for the current page. */
  href?: string
}

/** The header breadcrumbs for the current page. The last crumb is the current page. */
export function ShellBreadcrumbs({ items }: { items: Crumb[] }) {
  const { breadcrumbs } = useShellSlots()
  if (!breadcrumbs) return null
  return createPortal(
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap">
        {items.map((item, index) => {
          const last = index === items.length - 1
          return (
            <React.Fragment key={`${item.label}-${index}`}>
              <BreadcrumbItem className="min-w-0">
                {last || !item.href ? (
                  <BreadcrumbPage className="truncate">
                    {item.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    className="truncate"
                    render={<Link href={item.href} />}
                  >
                    {item.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {last ? null : <BreadcrumbSeparator />}
            </React.Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>,
    breadcrumbs
  )
}

/**
 * Breadcrumbs for a page of a World: the World's name, linking to the World
 * page, then the page. A Session page reads World › Session N.
 */
export function worldCrumbs(
  world: { id: string; name: string },
  page: "Skeleton" | { session: string }
): Crumb[] {
  return [
    { label: worldDisplayName(world.name), href: worldHref(world.id) },
    { label: typeof page === "string" ? page : page.session },
  ]
}
