/**
 * Entries: the items of the Codex (CONTEXT.md; spec §6 `entries`; ADR-0007).
 *
 * Column names in spec §6 are snake_case; these contracts use the matching
 * camelCase names one-to-one (`world_id` -> `worldId`, `data_json` -> `data`,
 * `is_start` -> `isStart`). Enum values keep the spec's spelling.
 */
import { z } from "zod"

export const ENTRY_KINDS = [
  "location",
  "character",
  "npc",
  "faction",
  "clue",
  "object",
  "exit_condition",
  "knowledge",
  "decisive_action",
] as const
export const entryKindSchema = z.enum(ENTRY_KINDS)
export type EntryKind = z.infer<typeof entryKindSchema>

/** ADR-0007: `world` Entries are things in the story; `story_logic` Entries are conditions code enforces. */
export const entryGroupSchema = z.enum(["world", "story_logic"])
export type EntryGroup = z.infer<typeof entryGroupSchema>

export const ENTRY_GROUP_OF: Record<EntryKind, EntryGroup> = {
  location: "world",
  character: "world",
  npc: "world",
  faction: "world",
  clue: "world",
  object: "world",
  exit_condition: "story_logic",
  knowledge: "story_logic",
  decisive_action: "story_logic",
}

export const ENTRY_GROUP_LABELS: Record<EntryGroup, string> = {
  world: "World",
  story_logic: "Story logic",
}

/** Kinds in display order within each group. */
export const ENTRY_KINDS_BY_GROUP: Record<EntryGroup, EntryKind[]> = {
  world: ["location", "character", "npc", "faction", "clue", "object"],
  story_logic: ["exit_condition", "knowledge", "decisive_action"],
}

export const ENTRY_KIND_LABELS: Record<
  EntryKind,
  { singular: string; plural: string }
> = {
  location: { singular: "Location", plural: "Locations" },
  character: { singular: "Character", plural: "Characters" },
  npc: { singular: "NPC", plural: "NPCs" },
  faction: { singular: "Faction", plural: "Factions" },
  clue: { singular: "Clue", plural: "Clues" },
  object: { singular: "Object", plural: "Objects" },
  exit_condition: { singular: "Exit condition", plural: "Exit conditions" },
  knowledge: { singular: "Knowledge", plural: "Knowledge" },
  decisive_action: { singular: "Decisive action", plural: "Decisive actions" },
}

export const entrySourceSchema = z.enum(["author", "setup", "play"])
export type EntrySource = z.infer<typeof entrySourceSchema>

export const entryStatusSchema = z.enum([
  "locked",
  "proposed",
  "accepted",
  "edited",
  "rejected",
])
export type EntryStatus = z.infer<typeof entryStatusSchema>

export const bandSchema = z.enum(["low", "normal", "high"])
export type Band = z.infer<typeof bandSchema>

/**
 * One setup validation answer from the Judge (spec §8 step 3) that failed or
 * was uncertain. Nothing is deleted on a flag; the Author decides.
 */
export const jevFlagSchema = z.object({
  question: z.enum(["contradiction", "period_fit"]),
  /** The question as asked, for the tooltip. */
  prompt: z.string(),
  probability: z.number().min(0).max(1),
  verdict: z.enum(["fail", "flagged"]),
})
export type JevFlag = z.infer<typeof jevFlagSchema>

const entryId = z.string().min(1)

// Kind-specific `data` (spec §6 `data_json`).

export const locationDataSchema = z.object({
  connections: z.array(entryId),
  isStart: z.boolean(),
})
export const characterDataSchema = z.object({
  role: z.string(),
  age: z.string(),
  personality: z.string(),
  backstory: z.string(),
  isPlayer: z.boolean(),
  /** Names of the fields that are secret: typed keys, or custom field labels. */
  hiddenFields: z.array(z.string()),
  aliases: z.array(z.string()),
})
export const factionDataSchema = z.object({})
export const objectDataSchema = z.object({})
export const clueDataSchema = z.object({
  locationId: entryId.nullable(),
  knownBy: z.array(entryId),
  reveals: z.string(),
  pointsToHidden: z.boolean(),
  redHerring: z.boolean(),
})
export const exitConditionDataSchema = z.object({
  arcIndex: z.number().int().min(0),
  condition: z.string(),
})
export const knowledgeDataSchema = z.object({
  characterId: entryId,
  fact: z.string(),
  minBand: bandSchema,
  clueId: entryId.nullable(),
})
export const decisiveActionDataSchema = z.object({
  verb: z.string(),
  correctTargetId: entryId,
  requires: z.array(entryId),
  /** When set, any `requiresCount` of `requires` suffice; otherwise all are needed. */
  requiresCount: z.number().int().min(1).nullable(),
  onSuccess: z.enum(["win", "none"]),
  /** Positive: subtracted from Reputation. */
  wrongTargetPenalty: z.number().int().min(0),
  prematurePenalty: z.number().int().min(0),
})

export const entryDataSchemas = {
  location: locationDataSchema,
  character: characterDataSchema,
  npc: characterDataSchema,
  faction: factionDataSchema,
  clue: clueDataSchema,
  object: objectDataSchema,
  exit_condition: exitConditionDataSchema,
  knowledge: knowledgeDataSchema,
  decisive_action: decisiveActionDataSchema,
} satisfies Record<EntryKind, z.ZodType>

export type EntryData<K extends EntryKind = EntryKind> = K extends EntryKind
  ? z.infer<(typeof entryDataSchemas)[K]>
  : never

const entryBase = {
  id: entryId,
  worldId: entryId,
  /** Null for a World template Entry; set for a Session's copy (ADR-0005). */
  sessionId: entryId.nullable(),
  /** For Session copies: the World Entry it was copied from. Null for play inventions. */
  templateId: entryId.nullable(),
  /** For Clues, a short handle plus title: "C1 — Matching knife wounds". */
  name: z.string(),
  description: z.string(),
  /** Custom Brief fields on an item land here, as "Label: text". */
  keyFacts: z.array(z.string()),
  source: entrySourceSchema,
  /** Turn index when `source` is `play`. */
  sourceTurn: z.number().int().min(0).nullable(),
  status: entryStatusSchema,
  jevFlags: z.array(jevFlagSchema),
  /**
   * When the Author first saw a play-invented Entry in the Codex pane; null
   * until then. Drives the "new, Turn N" marker. (UI addition to spec §6.)
   */
  seenAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}

function entryVariant<K extends EntryKind>(kind: K) {
  return z.object({
    ...entryBase,
    kind: z.literal(kind),
    data: entryDataSchemas[kind],
  })
}

export const entrySchema = z
  .discriminatedUnion("kind", [
    entryVariant("location"),
    entryVariant("character"),
    entryVariant("npc"),
    entryVariant("faction"),
    entryVariant("clue"),
    entryVariant("object"),
    entryVariant("exit_condition"),
    entryVariant("knowledge"),
    entryVariant("decisive_action"),
  ])
  .superRefine((entry, ctx) => {
    if (entry.source === "play" && entry.sourceTurn === null) {
      ctx.addIssue({
        code: "custom",
        message: "A play Entry needs its source Turn.",
        path: ["sourceTurn"],
      })
    }
    if (entry.source !== "play" && entry.sourceTurn !== null) {
      ctx.addIssue({
        code: "custom",
        message: "Only play Entries have a source Turn.",
        path: ["sourceTurn"],
      })
    }
    if (entry.sessionId === null && entry.templateId !== null) {
      ctx.addIssue({
        code: "custom",
        message: "Only Session copies point at a template.",
        path: ["templateId"],
      })
    }
    if (entry.kind === "npc" && entry.data.isPlayer) {
      ctx.addIssue({
        code: "custom",
        message: "An NPC cannot be the Player character.",
        path: ["data", "isPlayer"],
      })
    }
  })
export type Entry = z.infer<typeof entrySchema>
export type EntryOfKind<K extends EntryKind> = Extract<Entry, { kind: K }>

/** The parts of an Entry the Author can edit. */
export const entryContentSchema = z.discriminatedUnion("kind", [
  entryContentVariant("location"),
  entryContentVariant("character"),
  entryContentVariant("npc"),
  entryContentVariant("faction"),
  entryContentVariant("clue"),
  entryContentVariant("object"),
  entryContentVariant("exit_condition"),
  entryContentVariant("knowledge"),
  entryContentVariant("decisive_action"),
])
export type EntryContent = z.infer<typeof entryContentSchema>

function entryContentVariant<K extends EntryKind>(kind: K) {
  return z.object({
    kind: z.literal(kind),
    name: z.string(),
    description: z.string(),
    keyFacts: z.array(z.string()),
    data: entryDataSchemas[kind],
  })
}

export function entryContentOf(entry: Entry): EntryContent {
  return {
    kind: entry.kind,
    name: entry.name,
    description: entry.description,
    keyFacts: entry.keyFacts,
    data: entry.data,
  } as EntryContent
}

/** Characters and NPCs are the kinds that keep Hidden fields in their data. */
export function hasHiddenFields(
  entry: Entry
): entry is EntryOfKind<"character" | "npc"> {
  return entry.kind === "character" || entry.kind === "npc"
}

/** Formats a custom Brief field as a key fact string. */
export function formatKeyFact(label: string, text: string) {
  const cleanLabel = label.trim()
  return cleanLabel ? `${cleanLabel}: ${text.trim()}` : text.trim()
}

/** An Entry can be mentioned, targeted or copied into a Session unless it is rejected. */
export function isLiveEntry(entry: Pick<Entry, "status">) {
  return entry.status !== "rejected"
}

/** The live Entries of the given kinds, in Codex order. */
export function liveOfKinds<K extends EntryKind>(
  entries: readonly Entry[],
  kinds: readonly K[]
): EntryOfKind<K>[] {
  return entries.filter(
    (entry): entry is EntryOfKind<K> =>
      (kinds as readonly EntryKind[]).includes(entry.kind) && isLiveEntry(entry)
  )
}

/** The live Player character, if the Codex has one. */
export function playerCharacterOf(
  entries: readonly Entry[]
): EntryOfKind<"character"> | undefined {
  return liveOfKinds(entries, ["character"]).find((c) => c.data.isPlayer)
}

/** The Entry ids an Entry refers to through its kind-specific data. */
export function referencedEntryIds(entry: Entry): string[] {
  switch (entry.kind) {
    case "location":
      return entry.data.connections
    case "clue":
      return [
        ...(entry.data.locationId ? [entry.data.locationId] : []),
        ...entry.data.knownBy,
      ]
    case "knowledge":
      return [
        entry.data.characterId,
        ...(entry.data.clueId ? [entry.data.clueId] : []),
      ]
    case "decisive_action":
      return [entry.data.correctTargetId, ...entry.data.requires]
    default:
      return []
  }
}
