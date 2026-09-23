"use client"

/**
 * The Brief's save status, in the header: "Saving…", "Saved" or "Not saved —
 * retrying". It is also a Save-now button (Cmd/Ctrl+S), which in the failed
 * state doubles as Retry now. Its tooltip says when it last saved, or why it
 * did not.
 */
import { CheckIcon, CloudAlertIcon } from "lucide-react"

import { ShortcutKeys } from "@/components/shortcut-keys"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import type { SaveStatus } from "./autosave"

export const SAVE_SHORTCUT = "Mod-s"

export function saveStatusLabel(status: SaveStatus) {
  switch (status.kind) {
    case "saving":
      return "Saving…"
    case "saved":
      return "Saved"
    case "error":
      return status.retrying ? "Not saved — retrying" : "Not saved"
  }
}

export function SaveIndicator({
  status,
  onSaveNow,
  confirmKey,
}: {
  status: SaveStatus
  onSaveNow: () => void
  /** Changes on each Cmd/Ctrl+S, replaying a short confirmation. */
  confirmKey: number
}) {
  const label = saveStatusLabel(status)
  const failed = status.kind === "error"
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            aria-label={`${label}. ${failed ? "Retry now" : "Save now"}`}
            aria-keyshortcuts="Control+S Meta+S"
            onClick={onSaveNow}
            className={cn(failed && "text-destructive")}
          />
        }
      >
        <span
          key={confirmKey}
          className="inline-flex animate-in items-center gap-1 duration-200 fade-in-0 zoom-in-95 motion-reduce:animate-none"
        >
          {status.kind === "saving" ? (
            <Spinner
              data-icon="inline-start"
              className="motion-reduce:animate-none"
              aria-hidden
            />
          ) : null}
          {status.kind === "saved" ? (
            <CheckIcon data-icon="inline-start" aria-hidden />
          ) : null}
          {failed ? (
            <CloudAlertIcon data-icon="inline-start" aria-hidden />
          ) : null}
          {label}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <span className="flex flex-col gap-1">
          <span>{tooltipText(status)}</span>
          <span className="flex items-center gap-1.5">
            {failed ? "Retry now" : "Save now"}
            <ShortcutKeys shortcut={SAVE_SHORTCUT} />
          </span>
        </span>
      </TooltipContent>
    </Tooltip>
  )
}

function tooltipText(status: SaveStatus) {
  switch (status.kind) {
    case "saving":
      return "Your latest edits are being saved."
    case "saved":
      return status.at
        ? `Every edit is saved (last at ${new Date(status.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}).`
        : "Every edit is saved."
    case "error":
      return status.retrying
        ? `${status.message} Your edits are kept in this browser and saving will keep retrying.`
        : `${status.message} Your edits are kept in this browser.`
  }
}
