"use client"

/**
 * Deleting a World: the World actions menu (an icon-only button holding
 * "Delete World") and the confirmation dialog it opens. The Worlds home puts
 * the menu on every row; the World page puts it in the header.
 *
 * A permanent delete behind a confirmation, not an optimistic delete with an
 * Undo toast: Undo would need a soft delete that every query filters on, and
 * deleting a World is rare (issue #10).
 *
 * The dialog names the World and what goes with it; Cancel has focus when it
 * opens, so a stray Enter keeps the World. A failed delete keeps the dialog
 * open with the reason and Retry. The page decides where focus goes after a
 * delete (`finalFocus` is left to it); on Cancel or Escape focus returns to
 * the menu button.
 */
import * as React from "react"
import { EllipsisIcon, Trash2Icon, TriangleAlertIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { worldDisplayName, type SetupStatus } from "@/domain/world"
import { api, ApiError } from "@/lib/api-client"

import { deleteWorldCopy } from "./delete-world-copy"

/** What the menu and the dialog need to know about a World. */
export type DeletableWorld = {
  id: string
  name: string
  setupStatus: SetupStatus
  sessionCount: number
}

/** Why a World cannot be deleted right now, or null when it can. */
function deleteBlocked(world: Pick<DeletableWorld, "setupStatus">) {
  return world.setupStatus === "drafting"
    ? "Setup is running. Wait for it to finish."
    : null
}

/**
 * The World actions menu: an icon-only button with a tooltip and an
 * accessible name that includes the World's name, holding "Delete World".
 * While setup runs the item is disabled and says why.
 */
export function WorldActionsMenu({
  world,
  onDelete,
  triggerRef,
  className,
}: {
  world: DeletableWorld
  onDelete: () => void
  triggerRef?: React.Ref<HTMLButtonElement>
  className?: string
}) {
  const blocked = deleteBlocked(world)
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              render={
                <Button
                  ref={triggerRef}
                  variant="ghost"
                  size="icon"
                  className={className}
                  aria-label={`Actions for ${worldDisplayName(world.name)}`}
                />
              }
            />
          }
        >
          <EllipsisIcon aria-hidden />
        </TooltipTrigger>
        <TooltipContent>World actions</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-auto min-w-44">
        <DropdownMenuItem
          variant="destructive"
          disabled={blocked !== null}
          onClick={onDelete}
          // Dim the action, not the reason: the reason must stay readable.
          className="items-start data-disabled:opacity-100"
        >
          <Trash2Icon
            aria-hidden
            className="mt-0.5 group-data-disabled/dropdown-menu-item:opacity-50"
          />
          <span className="flex flex-col gap-0.5">
            <span className="group-data-disabled/dropdown-menu-item:opacity-50">
              Delete World
            </span>
            {blocked ? (
              <span className="text-xs text-muted-foreground">{blocked}</span>
            ) : null}
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * The delete confirmation. `world` stays set while the dialog closes, so its
 * words do not blank during the exit animation; `open` drives visibility.
 * `onDeleted` runs once the World is gone (a 404 counts: it is already
 * gone), and the page then closes the dialog and moves focus.
 */
export function DeleteWorldDialog({
  world,
  open,
  onOpenChange,
  onDeleted,
  returnFocus,
}: {
  world: DeletableWorld | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted: (world: DeletableWorld) => void
  /** Where focus goes on Cancel or Escape: the menu button that opened the dialog. */
  returnFocus: () => HTMLElement | null
}) {
  const cancelRef = React.useRef<HTMLButtonElement>(null)
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<ApiError | null>(null)
  const actionRef = React.useRef<HTMLButtonElement>(null)

  // The button was disabled while the request ran, which drops focus; put it
  // back on Retry once the failure shows.
  React.useEffect(() => {
    if (error) actionRef.current?.focus()
  }, [error])

  /** Set once the World is gone, so closing leaves focus to the page. */
  const deleted = React.useRef(false)

  const confirm = async () => {
    if (!world || pending) return
    setPending(true)
    setError(null)
    try {
      await api.deleteWorld(world.id)
    } catch (caught) {
      const failure =
        caught instanceof ApiError
          ? caught
          : new ApiError(0, "internal", "The World was not deleted. Try again.")
      if (failure.status !== 404) {
        setError(failure)
        setPending(false)
        return
      }
    }
    deleted.current = true
    setPending(false)
    onDeleted(world)
  }

  const copy = world ? deleteWorldCopy(world) : null

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        // A delete in flight finishes before the dialog can close.
        if (!next && pending) return
        onOpenChange(next)
      }}
      onOpenChangeComplete={(isOpen) => {
        // Each opening starts clean. `deleted` resets on open, not on close:
        // `finalFocus` reads it as the dialog closes.
        if (isOpen) deleted.current = false
        else setError(null)
      }}
    >
      <AlertDialogContent
        initialFocus={cancelRef}
        finalFocus={() => (deleted.current ? false : (returnFocus() ?? true))}
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="break-words">
            {copy?.title}
          </AlertDialogTitle>
          <AlertDialogDescription>{copy?.description}</AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <Alert variant="destructive">
            <TriangleAlertIcon aria-hidden />
            <AlertTitle>The World was not deleted</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel ref={cancelRef} disabled={pending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            ref={actionRef}
            variant="destructive"
            onClick={() => void confirm()}
            disabled={pending}
          >
            {pending ? (
              <Spinner data-icon="inline-start" aria-hidden />
            ) : (
              <Trash2Icon data-icon="inline-start" aria-hidden />
            )}
            {pending ? "Deleting…" : error ? "Retry" : "Delete World"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
