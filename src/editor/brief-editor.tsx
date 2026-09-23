"use client"

/**
 * The Brief surface (spec §7.1): section headings with `Label: value` fields,
 * and free prose. Converts the document to a Brief on every change and shows
 * §7.1 issues and warnings on the blocks they concern.
 */
import * as React from "react"

import { documentToBrief, type BriefConversion } from "@/brief/from-document"
import type { BriefIssue, BriefWarning } from "@/domain/brief"

import { flashBlock, focusBlock, type SandsEditor } from "./commands"
import { indexAnnotations } from "./editor-context"
import { SandsEditorView } from "./sands-editor-view"
import type { SandsBlock } from "./schema-config"

export type BriefEditorChange = {
  document: SandsBlock[]
  conversion: BriefConversion
}

export type BriefEditorHandle = {
  editor: () => SandsEditor | null
  /** Scrolls to an issue's or warning's block, puts the cursor there and briefly highlights it. */
  focusIssue: (issue: BriefIssue | BriefWarning) => void
  focusBlock: (blockId: string) => void
  document: () => SandsBlock[]
}

export type BriefEditorProps = {
  /** Read at mount. Remount with a new `key` to load another Brief. */
  initialDocument: readonly SandsBlock[]
  /** Read-only, e.g. while setup runs. */
  readOnly?: boolean
  /** Show §7.1 issues and warnings on their blocks (default true). */
  highlightIssues?: boolean
  onChange?: (change: BriefEditorChange) => void
  className?: string
  ref?: React.Ref<BriefEditorHandle>
}

function targetOf(item: BriefIssue | BriefWarning) {
  return "fieldBlockId" in item
    ? (item.fieldBlockId ?? item.blockId)
    : item.blockId
}

export function BriefEditor({
  initialDocument,
  readOnly,
  highlightIssues = true,
  onChange,
  className,
  ref,
}: BriefEditorProps) {
  const editorRef = React.useRef<SandsEditor | null>(null)
  const [conversion, setConversion] = React.useState(() =>
    documentToBrief(initialDocument)
  )

  const annotations = React.useMemo(
    () =>
      highlightIssues
        ? indexAnnotations([
            ...conversion.issues.map((issue) => ({
              blockId: targetOf(issue),
              severity: "error" as const,
              message: issue.message,
            })),
            ...conversion.warnings.map((warning) => ({
              blockId: warning.blockId,
              severity: "warning" as const,
              message: warning.message,
            })),
          ])
        : new Map(),
    [conversion, highlightIssues]
  )

  React.useImperativeHandle(
    ref,
    () => ({
      editor: () => editorRef.current,
      focusIssue: (item) => {
        const editor = editorRef.current
        const target = targetOf(item)
        if (!editor || !target) return
        focusBlock(editor, target)
        flashBlock(editor, target)
      },
      focusBlock: (blockId) => {
        if (editorRef.current) focusBlock(editorRef.current, blockId)
      },
      document: () =>
        (editorRef.current?.document as SandsBlock[] | undefined) ?? [
          ...initialDocument,
        ],
    }),
    [initialDocument]
  )

  return (
    <SandsEditorView
      surface="brief"
      label="Brief"
      initialContent={initialDocument}
      readOnly={readOnly}
      className={className}
      context={{ annotations }}
      onReady={(editor) => {
        editorRef.current = editor
      }}
      onChange={(document) => {
        const next = documentToBrief(document)
        setConversion(next)
        onChange?.({ document, conversion: next })
      }}
    />
  )
}
