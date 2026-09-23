"use client"

/**
 * How an Entry's kind, source, status and Jev flags look, everywhere they
 * appear: Entry blocks, mention previews, the setup review summary and the
 * Codex pane.
 */
import {
  CheckIcon,
  DoorOpenIcon,
  FeatherIcon,
  FingerprintIcon,
  FlagIcon,
  GavelIcon,
  GlobeIcon,
  LightbulbIcon,
  LockIcon,
  MapPinIcon,
  PackageIcon,
  PencilIcon,
  RouteIcon,
  TrophyIcon,
  TriangleAlertIcon,
  UserIcon,
  UsersIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { BriefBlockType } from "@/brief/fields"
import {
  ENTRY_KIND_LABELS,
  type EntryKind,
  type EntrySource,
  type EntryStatus,
  type JevFlag,
} from "@/domain/entry"

export const ENTRY_KIND_ICONS: Record<EntryKind, LucideIcon> = {
  location: MapPinIcon,
  character: UserIcon,
  npc: UsersIcon,
  faction: FlagIcon,
  clue: FingerprintIcon,
  object: PackageIcon,
  exit_condition: DoorOpenIcon,
  knowledge: LightbulbIcon,
  decisive_action: GavelIcon,
}

export const BRIEF_BLOCK_ICONS: Record<BriefBlockType, LucideIcon> = {
  setting: GlobeIcon,
  character: UserIcon,
  arc: RouteIcon,
  ending: TrophyIcon,
  location: MapPinIcon,
  voice: FeatherIcon,
}

export function EntryKindBadge({ kind }: { kind: EntryKind }) {
  const Icon = ENTRY_KIND_ICONS[kind]
  return (
    <Badge variant="secondary">
      <Icon data-icon="inline-start" aria-hidden />
      {ENTRY_KIND_LABELS[kind].singular}
    </Badge>
  )
}

export function sourceLabel(source: EntrySource, sourceTurn: number | null) {
  if (source === "play")
    return sourceTurn === null ? "Play" : `Play, Turn ${sourceTurn + 1}`
  return source === "author" ? "Author" : "Setup"
}

export function EntrySourceBadge({
  source,
  sourceTurn,
}: {
  source: EntrySource
  sourceTurn: number | null
}) {
  return (
    <Badge
      variant="outline"
      aria-label={`Source: ${sourceLabel(source, sourceTurn)}`}
    >
      {sourceLabel(source, sourceTurn)}
    </Badge>
  )
}

const STATUS: Record<
  EntryStatus,
  {
    label: string
    icon: LucideIcon | null
    variant: "default" | "secondary" | "outline" | "destructive"
  }
> = {
  locked: { label: "Locked", icon: LockIcon, variant: "outline" },
  proposed: { label: "Proposed", icon: null, variant: "secondary" },
  // UI wording (the Author's choice): Approved and Removed; the data keeps `accepted` / `rejected`.
  accepted: { label: "Approved", icon: CheckIcon, variant: "default" },
  edited: { label: "Edited", icon: PencilIcon, variant: "outline" },
  rejected: { label: "Removed", icon: XIcon, variant: "destructive" },
}

export function EntryStatusBadge({ status }: { status: EntryStatus }) {
  const { label, icon: Icon, variant } = STATUS[status]
  return (
    <Badge variant={variant} aria-label={`Status: ${label}`}>
      {Icon ? <Icon data-icon="inline-start" aria-hidden /> : null}
      {label}
    </Badge>
  )
}

export function entryStatusLabel(status: EntryStatus) {
  return STATUS[status].label
}

const FLAG_QUESTION: Record<JevFlag["question"], string> = {
  contradiction: "Contradicts the Brief",
  period_fit: "Fits the setting and period",
}

/** A badge for an Entry's Jev flags; its tooltip lists each failed or uncertain question with its probability. */
export function JevFlagBadge({ flags }: { flags: readonly JevFlag[] }) {
  if (flags.length === 0) return null
  const failed = flags.some((flag) => flag.verdict === "fail")
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Badge
            variant={failed ? "destructive" : "outline"}
            tabIndex={0}
            aria-label={`Judge flag: ${flags.map((f) => `${FLAG_QUESTION[f.question]}, ${formatProbability(f.probability)}, ${f.verdict}`).join("; ")}`}
          />
        }
      >
        <TriangleAlertIcon data-icon="inline-start" aria-hidden />
        {failed ? "Judge flag" : "Judge unsure"}
      </TooltipTrigger>
      <TooltipContent className="max-w-sm flex-col items-start gap-1">
        {flags.map((flag) => (
          <span
            key={`${flag.question}-${flag.prompt}`}
            className="flex flex-col"
          >
            <span className="font-medium">{flag.prompt}</span>
            <span>
              {flag.question === "period_fit"
                ? "Fits the period"
                : "Contradicts the Brief"}
              : p = {formatProbability(flag.probability)},{" "}
              {flag.verdict === "fail" ? "failed" : "uncertain"}
            </span>
          </span>
        ))}
      </TooltipContent>
    </Tooltip>
  )
}

export function formatProbability(p: number) {
  return p.toFixed(2)
}
