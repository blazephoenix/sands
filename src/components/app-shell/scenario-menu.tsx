"use client"

/**
 * Dev-only: forces named fixture scenarios (src/fixtures/scenarios.ts) by
 * setting `?scenario=` on the page URL, which every API call then forwards.
 */
import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { FlaskConicalIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { SCENARIO_IDS, SCENARIO_QUERY, SCENARIOS, parseScenarios, type ScenarioId } from "@/fixtures/scenarios"

function ScenarioMenuInner() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const active = parseScenarios(searchParams.get(SCENARIO_QUERY))

  const apply = (next: ScenarioId[]) => {
    const params = new URLSearchParams(searchParams.toString())
    if (next.length > 0) params.set(SCENARIO_QUERY, next.join(","))
    else params.delete(SCENARIO_QUERY)
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  const label = active.length > 0 ? `Scenarios: ${active.map((id) => SCENARIOS[id].label).join(", ")}` : "Force a fixture scenario"

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              render={<Button variant={active.length > 0 ? "secondary" : "ghost"} size={active.length > 0 ? "sm" : "icon"} aria-label={label} />}
            />
          }
        >
          <FlaskConicalIcon data-icon={active.length > 0 ? "inline-start" : undefined} aria-hidden />
          {active.length > 0 ? <Badge variant="outline">{active.length}</Badge> : null}
        </TooltipTrigger>
        <TooltipContent>{label} (dev only)</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Fixture scenarios (dev only)</DropdownMenuLabel>
          {SCENARIO_IDS.map((id) => (
            <DropdownMenuCheckboxItem
              key={id}
              checked={active.includes(id)}
              onCheckedChange={(checked) => apply(checked ? [...active, id] : active.filter((a) => a !== id))}
            >
              <span className="flex flex-col">
                <span>{SCENARIOS[id].label}</span>
                <span className="text-xs text-muted-foreground">{SCENARIOS[id].description}</span>
              </span>
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem disabled={active.length === 0} onClick={() => apply([])}>
            Clear scenarios
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={async () => {
              await fetch("/api/dev/reset", { method: "POST" })
              router.refresh()
            }}
          >
            Reset fixture data
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function ScenarioMenu() {
  if (process.env.NODE_ENV === "production") return null
  return (
    <React.Suspense fallback={<span className="size-8" aria-hidden />}>
      <ScenarioMenuInner />
    </React.Suspense>
  )
}
