"use client"

/**
 * The shared editor's public entry point for pages. BlockNote needs the
 * browser, so both surfaces load on the client only, with a skeleton shaped
 * like the content meanwhile (no layout shift, no full-page spinner).
 *
 *   import { BriefEditor, EntryEditor } from "@/editor"
 */
import dynamic from "next/dynamic"

import { Skeleton } from "@/components/ui/skeleton"

/** A document-shaped placeholder: section label, name, a few `Label:` lines. */
export function EditorSkeleton({ sections = 3 }: { sections?: number }) {
  return (
    <div className="flex flex-col gap-7 py-4 ps-12 pe-4" aria-busy="true" aria-label="Loading editor">
      {Array.from({ length: sections }, (_, index) => (
        <div key={index} className="flex flex-col gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full max-w-md" />
          <Skeleton className="h-4 w-3/4 max-w-sm" />
        </div>
      ))}
    </div>
  )
}

export const BriefEditor = dynamic(() => import("./brief-editor").then((m) => m.BriefEditor), {
  ssr: false,
  loading: () => <EditorSkeleton sections={4} />,
})

export const EntryEditor = dynamic(() => import("./entry-editor").then((m) => m.EntryEditor), {
  ssr: false,
  loading: () => <EditorSkeleton sections={4} />,
})

export type { BriefEditorChange, BriefEditorHandle, BriefEditorProps } from "./brief-editor"
export type { EntryEditorHandle, EntryEditorProps } from "./entry-editor"
export type { BlockAction, BlockAnnotation, EntryBlockInfo, EntrySummary } from "./editor-context"
export type { EntryBlockConversion, EntryBlockIssue, EntryBlockWarning } from "./entry-blocks"
export { EDITOR_SHORTCUTS } from "./shortcuts"
