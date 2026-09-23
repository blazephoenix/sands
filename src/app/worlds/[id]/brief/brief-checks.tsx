"use client"

/**
 * The Brief's live validation summary (spec §7.1 rules): every problem that
 * blocks setup, then every warning (probable label typos, unnamed sections).
 * Choosing one scrolls to its block and puts the cursor in the field. A problem
 * with no block to point at (no Arc, no Ending, no Character) adds the missing
 * section instead.
 */
import { CircleAlertIcon, CircleCheckIcon, PlusIcon, TriangleAlertIcon } from "lucide-react"

import { ShortcutKeys } from "@/components/shortcut-keys"
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item"
import type { BriefConversion } from "@/brief/from-document"
import { BRIEF_BLOCKS, type BriefBlockType } from "@/brief/fields"
import type { BriefIssue, BriefWarning } from "@/domain/brief"
import { EDITOR_SHORTCUTS } from "@/editor"

/** The section a missing-section problem asks for. */
export function missingSectionOf(issue: BriefIssue): BriefBlockType | null {
  if (issue.blockId !== null) return null
  switch (issue.code) {
    case "no_arc":
      return "arc"
    case "no_ending":
      return "ending"
    case "no_player_character":
      return "character"
    default:
      return null
  }
}

/** "Character · Max Rober", for each section heading in the draft. */
function sectionNames(conversion: BriefConversion) {
  const names = new Map<string, string>()
  const { draft } = conversion
  const add = (type: BriefBlockType, blockId: string, name?: string) =>
    names.set(blockId, name?.trim() ? `${BRIEF_BLOCKS[type].title} · ${name.trim()}` : BRIEF_BLOCKS[type].title)
  draft.settings.forEach((item) => add("setting", item.blockId))
  draft.characters.forEach((item) => add("character", item.blockId, item.name))
  // Arcs are ordered, so an unnamed one is still findable by its place.
  draft.arcs.forEach((item, index) =>
    names.set(item.blockId, item.name.trim() ? `Arc ${index + 1} · ${item.name.trim()}` : `Arc ${index + 1}`)
  )
  draft.endings.forEach((item) => add("ending", item.blockId))
  draft.locations.forEach((item) => add("location", item.blockId, item.name))
  draft.voices.forEach((item) => add("voice", item.blockId))
  return names
}

/** The heading a warning's block sits under, found in document order. */
function sectionOfBlock(conversion: BriefConversion, blockId: string) {
  for (const [headingId, fields] of Object.entries(conversion.fieldBlockIds)) {
    if (headingId === blockId || Object.values(fields).includes(blockId)) return headingId
  }
  return null
}

export function BriefChecks({
  conversion,
  onFocus,
  onAddSection,
}: {
  conversion: BriefConversion
  onFocus: (item: BriefIssue | BriefWarning) => void
  onAddSection: (type: BriefBlockType) => void
}) {
  const names = sectionNames(conversion)
  const { issues, warnings } = conversion
  const where = (blockId: string | null) => (blockId ? names.get(blockId) : undefined)

  return (
    <section aria-labelledby="brief-checks-title" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id="brief-checks-title" className="font-heading text-sm font-semibold">
          Checks
        </h2>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground" aria-live="polite">
          {issues.length === 0 ? (
            <>
              <CircleCheckIcon className="size-4 shrink-0" aria-hidden />
              The Brief is ready for setup.
            </>
          ) : (
            <>
              <CircleAlertIcon className="size-4 shrink-0 text-destructive" aria-hidden />
              {issues.length === 1 ? "1 problem blocks setup." : `${issues.length} problems block setup.`}
            </>
          )}
        </p>
      </div>

      {issues.length > 0 ? (
        <ItemGroup className="gap-1.5" aria-label="Problems that block setup">
          {issues.map((issue, index) => {
            const missing = missingSectionOf(issue)
            const location = where(issue.blockId)
            return (
              <div role="listitem" key={`${issue.code}-${issue.blockId ?? "doc"}-${index}`}>
                <Item
                  size="xs"
                  variant="outline"
                  render={<button type="button" onClick={() => (missing ? onAddSection(missing) : onFocus(issue))} />}
                  className="text-left"
                >
                  <ItemMedia variant="icon">
                    {missing ? <PlusIcon aria-hidden /> : <CircleAlertIcon className="text-destructive" aria-hidden />}
                  </ItemMedia>
                  <ItemContent className="min-w-0">
                    <ItemTitle className="line-clamp-none">{issue.message}</ItemTitle>
                    <ItemDescription>
                      {missing ? (
                        `Adds ${/^[AEIOU]/.test(BRIEF_BLOCKS[missing].title) ? "an" : "a"} ${BRIEF_BLOCKS[missing].title} at the end of the Brief.`
                      ) : issue.field === "isPlayer" ? (
                        <span className="inline-flex flex-wrap items-center gap-1">
                          {location ? `${location}. ` : null}Toggle Player character in the block menu,
                          <ShortcutKeys shortcut={EDITOR_SHORTCUTS.blockMenu} />
                        </span>
                      ) : (
                        location
                      )}
                    </ItemDescription>
                  </ItemContent>
                </Item>
              </div>
            )
          })}
        </ItemGroup>
      ) : null}

      {warnings.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <h3 className="text-xs font-medium text-muted-foreground">
            {warnings.length === 1 ? "1 thing to check" : `${warnings.length} things to check`}
          </h3>
          <ItemGroup className="gap-1.5" aria-label="Things to check">
            {warnings.map((warning, index) => {
              const heading = sectionOfBlock(conversion, warning.blockId)
              return (
                <div role="listitem" key={`${warning.code}-${warning.blockId}-${index}`}>
                  <Item size="xs" variant="outline" render={<button type="button" onClick={() => onFocus(warning)} />} className="text-left">
                    <ItemMedia variant="icon">
                      <TriangleAlertIcon className="text-muted-foreground" aria-hidden />
                    </ItemMedia>
                    <ItemContent className="min-w-0">
                      <ItemTitle className="line-clamp-none font-normal">{warning.message}</ItemTitle>
                      {heading && where(heading) ? <ItemDescription>{where(heading)}</ItemDescription> : null}
                    </ItemContent>
                  </Item>
                </div>
              )
            })}
          </ItemGroup>
        </div>
      ) : null}
    </section>
  )
}
