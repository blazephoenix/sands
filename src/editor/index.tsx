"use client"

/**
 * The Skeleton editor's public entry point for pages. BlockNote needs the
 * browser, so the editor loads on the client only, with a skeleton shaped
 * like a document meanwhile (no layout shift, no full-page spinner).
 */
import dynamic from "next/dynamic"

import { Skeleton } from "@/components/ui/skeleton"

export function EditorSkeleton() {
  return (
    <div
      className="flex flex-col gap-3 py-4 ps-12 pe-4"
      aria-busy="true"
      aria-label="Loading editor"
    >
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-5 w-full max-w-md" />
      <Skeleton className="h-5 w-3/4 max-w-sm" />
      <Skeleton className="h-5 w-full max-w-md" />
      <Skeleton className="h-5 w-2/3 max-w-sm" />
    </div>
  )
}

export const DocumentEditor = dynamic(
  () => import("./document-editor").then((m) => m.DocumentEditor),
  { ssr: false, loading: () => <EditorSkeleton /> }
)

export type { DocumentEditorProps } from "./document-editor"
export { HIDDEN_SHORTCUT } from "./shortcuts"
