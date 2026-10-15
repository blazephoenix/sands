/**
 * The Skeleton editor's sections, in order, and where an issue's path points:
 * `characters.1.ties.0.toward` is the second character's row;
 * `story.title` is the Story section.
 */
import type { SkeletonIssue } from "@/skeleton/check"
import {
  FIELD_SECTION_CONFIG,
  ROW_SECTION_CONFIG,
  type FieldSection,
  type RowSection,
} from "@/skeleton/document"

export type SectionKey = FieldSection | RowSection

export const SECTION_ORDER: readonly SectionKey[] = [
  "story",
  "playSettings",
  "characters",
  "places",
  "worldRules",
  "promises",
  "arcs",
  "secrets",
  "endings",
  "stateFlags",
  "voiceAndCanon",
]

export function isRowSection(key: SectionKey): key is RowSection {
  return key in ROW_SECTION_CONFIG
}

export function sectionTitle(key: SectionKey) {
  return isRowSection(key)
    ? ROW_SECTION_CONFIG[key].title
    : FIELD_SECTION_CONFIG[key].title
}

export function parseSection(value: string | null): SectionKey {
  return SECTION_ORDER.find((key) => key === value) ?? "story"
}

/** The section and, for a row section, the row index an issue belongs to. */
export function issueTarget(issue: SkeletonIssue): {
  section: SectionKey
  row: number | null
} {
  const [section, index] = issue.path.split(".")
  const key = parseSection(section)
  const row = isRowSection(key) && index !== undefined ? Number(index) : null
  return { section: key, row: Number.isInteger(row) ? row : null }
}
