"use client"

/**
 * The World's name, editable in place at the top of the Brief page: the name
 * as the page heading with a Rename button (F2), which swaps in an input.
 * Enter or leaving the field keeps the new name; Escape puts the old one back.
 */
import * as React from "react"
import { PencilIcon } from "lucide-react"

import { ShortcutKeys } from "@/components/shortcut-keys"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export const RENAME_SHORTCUT = "F2"

export type WorldNameProps = {
  name: string
  onRename: (name: string) => void
  editing: boolean
  onEditingChange: (editing: boolean) => void
}

export function WorldName({ name, onRename, editing, onEditingChange }: WorldNameProps) {
  const buttonRef = React.useRef<HTMLButtonElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const wasEditing = React.useRef(false)

  React.useEffect(() => {
    if (editing) inputRef.current?.select()
    else if (wasEditing.current) buttonRef.current?.focus()
    wasEditing.current = editing
  }, [editing])

  const commit = () => {
    const next = inputRef.current?.value.trim() ?? name
    if (next !== name) onRename(next)
    onEditingChange(false)
  }

  if (editing) {
    return (
      <form
        className="flex min-h-9 items-center"
        onSubmit={(event) => {
          event.preventDefault()
          commit()
        }}
      >
        <Field className="max-w-md">
          <FieldLabel htmlFor="world-name" className="sr-only">
            World name
          </FieldLabel>
          <Input
            id="world-name"
            ref={inputRef}
            defaultValue={name}
            maxLength={200}
            placeholder="Untitled World"
            autoComplete="off"
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault()
                onEditingChange(false)
              }
            }}
          />
        </Field>
      </form>
    )
  }

  return (
    <div className="flex min-h-9 min-w-0 items-center gap-1.5">
      <h1 className="truncate font-heading text-2xl font-semibold tracking-tight">
        {name || <span className="text-muted-foreground">Untitled World</span>}
      </h1>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              ref={buttonRef}
              variant="ghost"
              size="icon-sm"
              aria-label="Rename World"
              aria-keyshortcuts={RENAME_SHORTCUT}
              onClick={() => onEditingChange(true)}
            />
          }
        >
          <PencilIcon aria-hidden />
        </TooltipTrigger>
        <TooltipContent>
          Rename World
          <ShortcutKeys shortcut={RENAME_SHORTCUT} />
        </TooltipContent>
      </Tooltip>
    </div>
  )
}
