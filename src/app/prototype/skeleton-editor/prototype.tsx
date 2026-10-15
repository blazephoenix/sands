"use client"

/**
 * PROTOTYPE, throwaway (issue #36): four ways the Skeleton editor could look,
 * filled from a fixture. Pick a variant, or a mix, and the real editor is
 * built from that choice; this folder is then deleted.
 */
import * as React from "react"
import dynamic from "next/dynamic"
import Link from "next/link"

import { Skeleton } from "@/components/ui/skeleton"
import { FIXTURES } from "@/fixtures"
import { cn } from "@/lib/utils"
import { plainText } from "@/skeleton/hidden-text"

import { skeletonSections, type ProtoSection } from "./to-blocks"

const ProtoEditor = dynamic(() => import("./editor"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col gap-3 p-4">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-4 w-full max-w-md" />
      <Skeleton className="h-4 w-3/4 max-w-sm" />
    </div>
  ),
})

type Variant = "A" | "B" | "C" | "D"

const VARIANTS: Record<Variant, { name: string; summary: string }> = {
  A: {
    name: "A · Tables, as in #24",
    summary:
      "One document. Fields are Label: value lines. Characters and Arcs are cards, with Ties and Agendas as tables inside them. Places, World rules, Promises, Hidden truth, Endings and State flags are native tables.",
  },
  B: {
    name: "B · Every row a card",
    summary:
      "One document, no tables. Every row (a Place, a Secret, an Ending, a Tie, an Agenda) is its own heading followed by Label: value lines. Long text has room; every row can carry its own issue marker later.",
  },
  C: {
    name: "C · A, with an outline",
    summary:
      "Variant A plus a sticky outline on the left: every section with its row count. Click to jump. The outline is where issues that block play would show.",
  },
  D: {
    name: "D · One section at a time",
    summary:
      "The outline is the navigation: pick a section on the left and edit only that section on the right, in A's layout. Shorter page, less to take in at once.",
  },
}

export function Prototype({
  variant,
  fixture,
}: {
  variant: Variant
  fixture: number
}) {
  const skeleton = FIXTURES[fixture % FIXTURES.length]
  const sections = skeletonSections(
    skeleton,
    variant === "B" ? "cards" : "tables"
  )
  const href = (v: Variant, f = fixture) =>
    `/prototype/skeleton-editor?variant=${v}&fixture=${f}`

  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Prototype for #36. Hidden text shows muted with a dashed underline.
        </p>
        <nav aria-label="Variants" className="flex flex-wrap gap-2">
          {(Object.keys(VARIANTS) as Variant[]).map((v) => (
            <Link
              key={v}
              href={href(v)}
              aria-current={v === variant ? "page" : undefined}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm",
                v === variant
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              {VARIANTS[v].name}
            </Link>
          ))}
        </nav>
        <nav aria-label="Fixtures" className="flex flex-wrap gap-2 text-sm">
          {FIXTURES.map((f, index) => (
            <Link
              key={index}
              href={href(variant, index)}
              aria-current={
                index === fixture % FIXTURES.length ? "page" : undefined
              }
              className={cn(
                "underline-offset-4 hover:underline",
                index === fixture % FIXTURES.length
                  ? "font-medium underline"
                  : "text-muted-foreground"
              )}
            >
              {plainText(f.story.title)}
            </Link>
          ))}
        </nav>
        <p className="max-w-prose leading-relaxed">
          {VARIANTS[variant].summary}
        </p>
      </div>

      {variant === "A" || variant === "B" ? (
        <ProtoEditor
          key={`${variant}-${fixture}`}
          blocks={sections.flatMap((s) => s.blocks)}
        />
      ) : null}
      {variant === "C" ? (
        <WithOutline key={fixture} sections={sections} />
      ) : null}
      {variant === "D" ? (
        <OneSectionAtATime key={fixture} sections={sections} />
      ) : null}
    </div>
  )
}

function Outline({
  sections,
  current,
  onPick,
}: {
  sections: ProtoSection[]
  current: string | null
  onPick: (id: string) => void
}) {
  return (
    <nav aria-label="Skeleton sections" className="flex flex-col gap-0.5">
      {sections.map((section) => (
        <button
          key={section.id}
          type="button"
          onClick={() => onPick(section.id)}
          aria-current={current === section.id ? "true" : undefined}
          className={cn(
            "flex items-center justify-between rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
            current === section.id && "bg-muted font-medium"
          )}
        >
          {section.title}
          {section.count !== null ? (
            <span className="text-xs text-muted-foreground tabular-nums">
              {section.count}
            </span>
          ) : null}
        </button>
      ))}
    </nav>
  )
}

function WithOutline({ sections }: { sections: ProtoSection[] }) {
  return (
    <div className="grid grid-cols-[12rem_1fr] gap-6">
      <div className="sticky top-20 self-start">
        <Outline
          sections={sections}
          current={null}
          onPick={(id) =>
            document
              .querySelector(`[data-id="sec-${id}"]`)
              ?.scrollIntoView({ block: "start", behavior: "smooth" })
          }
        />
      </div>
      <ProtoEditor blocks={sections.flatMap((s) => s.blocks)} />
    </div>
  )
}

function OneSectionAtATime({ sections }: { sections: ProtoSection[] }) {
  const [current, setCurrent] = React.useState(sections[0].id)
  const section = sections.find((s) => s.id === current) ?? sections[0]
  return (
    <div className="grid grid-cols-[12rem_1fr] gap-6">
      <div className="sticky top-20 self-start">
        <Outline sections={sections} current={current} onPick={setCurrent} />
      </div>
      <ProtoEditor key={section.id} blocks={section.blocks} />
    </div>
  )
}
