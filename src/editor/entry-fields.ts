/**
 * The Entry sections' known fields (spec §6 kind data, §7.2): one `Label: value`
 * line each, under the Entry's heading. Shared by the editor and the Entry <->
 * block conversion. Pure data.
 *
 * Value types:
 * - `text`: free text (Hidden style allowed on Characters and NPCs).
 * - `list`: comma-separated text.
 * - `ref` / `refs`: one or several `@` mentions of Entries of the given kinds.
 * - `boolean`: yes / no.
 * - `number`: a whole number; `requiresCount` also takes "all".
 * - `enum`: one of `values`.
 * - `arc`: a 1-based Arc number.
 */
import { PERSON_PLACEHOLDERS } from "@/brief/fields"
import type { EntryKind } from "@/domain/entry"

export type EntryFieldType =
  "text" | "list" | "ref" | "refs" | "boolean" | "number" | "enum" | "arc"

export type EntryFieldSpec = {
  /** The Entry property it fills: `description`, or a key of the kind's `data`. */
  key: string
  label: string
  aliases?: string[]
  type: EntryFieldType
  /** For `ref` / `refs`: the kinds a mention may point at. */
  kinds?: EntryKind[]
  /** For `ref`: the field must name an Entry. */
  required?: boolean
  /** For `enum`: document spelling -> data value. */
  values?: Record<string, string>
  placeholder: string
}

const description = (placeholder: string): EntryFieldSpec => ({
  key: "description",
  label: "Description",
  type: "text",
  placeholder,
})

const person: EntryFieldSpec[] = [
  {
    key: "role",
    label: "Role",
    type: "text",
    placeholder: PERSON_PLACEHOLDERS.role,
  },
  {
    key: "age",
    label: "Age",
    type: "text",
    placeholder: PERSON_PLACEHOLDERS.age,
  },
  {
    key: "personality",
    label: "Personality",
    type: "text",
    placeholder: PERSON_PLACEHOLDERS.personality,
  },
  {
    key: "backstory",
    label: "Backstory",
    type: "text",
    placeholder: PERSON_PLACEHOLDERS.backstory,
  },
  {
    key: "aliases",
    label: "Aliases",
    aliases: ["Alias"],
    type: "list",
    placeholder: PERSON_PLACEHOLDERS.aliases,
  },
]

export const ENTRY_FIELDS: Record<EntryKind, EntryFieldSpec[]> = {
  location: [
    description("What the place is like."),
    {
      key: "connections",
      label: "Connections",
      aliases: ["Connection", "Connects to"],
      type: "refs",
      kinds: ["location"],
      placeholder: "@ a Location",
    },
    {
      key: "isStart",
      label: "Start location",
      aliases: ["Start"],
      type: "boolean",
      placeholder: "yes or no",
    },
  ],
  character: [
    description("Who they are in a sentence."),
    ...person,
    {
      key: "isPlayer",
      label: "Player character",
      type: "boolean",
      placeholder: "yes or no",
    },
  ],
  npc: [description("Who they are in a sentence."), ...person],
  faction: [description("Who belongs and what they want.")],
  clue: [
    description("What the Player finds."),
    {
      key: "locationId",
      label: "Found at",
      type: "ref",
      kinds: ["location"],
      placeholder: "@ a Location, or leave empty",
    },
    {
      key: "knownBy",
      label: "Known by",
      type: "refs",
      kinds: ["character", "npc"],
      placeholder: "@ a Character or NPC",
    },
    {
      key: "reveals",
      label: "Reveals",
      type: "text",
      placeholder: "What finding it tells the Player.",
    },
    {
      key: "pointsToHidden",
      label: "Points to Hidden truth",
      aliases: ["Points to hidden"],
      type: "boolean",
      placeholder: "yes or no",
    },
    {
      key: "redHerring",
      label: "Red herring",
      type: "boolean",
      placeholder: "yes or no",
    },
  ],
  object: [description("What it is and where it sits.")],
  exit_condition: [
    description("Why this condition matters."),
    { key: "arcIndex", label: "Arc", type: "arc", placeholder: "1" },
    {
      key: "condition",
      label: "Condition",
      type: "text",
      placeholder:
        "A checkable statement, such as: the Player character has visited the harbour.",
    },
  ],
  knowledge: [
    description("Context for this fact."),
    {
      key: "characterId",
      label: "Character",
      aliases: ["Known by"],
      type: "ref",
      kinds: ["character", "npc"],
      required: true,
      placeholder: "@ a Character or NPC",
    },
    {
      key: "fact",
      label: "Fact",
      type: "text",
      placeholder: "What they know.",
    },
    {
      key: "minBand",
      label: "Min band",
      aliases: ["Minimum band", "Band"],
      type: "enum",
      values: { low: "low", normal: "normal", high: "high" },
      placeholder: "low, normal or high",
    },
    {
      key: "clueId",
      label: "Clue",
      aliases: ["Reveals clue"],
      type: "ref",
      kinds: ["clue"],
      placeholder: "@ a Clue, or leave empty",
    },
  ],
  decisive_action: [
    description("What success and a wrong target mean."),
    {
      key: "verb",
      label: "Verb",
      type: "text",
      placeholder: "The action, such as arrest, duel or confess to.",
    },
    {
      key: "correctTargetId",
      label: "Target",
      aliases: ["Correct target"],
      type: "ref",
      kinds: ["character", "npc"],
      required: true,
      placeholder: "@ the right Character or NPC",
    },
    {
      key: "requires",
      label: "Requires",
      aliases: ["Requires clues"],
      type: "refs",
      kinds: ["clue"],
      placeholder: "@C1, @C3",
    },
    {
      key: "requiresCount",
      label: "Clues needed",
      aliases: ["Requires count"],
      type: "number",
      placeholder: "all, or a number",
    },
    {
      key: "onSuccess",
      label: "On success",
      type: "enum",
      values: { win: "win", continue: "none", none: "none" },
      placeholder: "win or continue",
    },
    {
      key: "wrongTargetPenalty",
      label: "Wrong target penalty",
      type: "number",
      placeholder: "15",
    },
    {
      key: "prematurePenalty",
      label: "Premature penalty",
      aliases: ["Too early penalty"],
      type: "number",
      placeholder: "20",
    },
  ],
}

export function entryFieldSpecFor(
  kind: EntryKind,
  key: string
): EntryFieldSpec | undefined {
  return ENTRY_FIELDS[kind].find((field) => field.key === key)
}

/** Characters and NPCs keep Hidden fields in their data. */
export function entryKindHasHiddenFields(kind: EntryKind) {
  return kind === "character" || kind === "npc"
}

/** One line per kind for the Entry surface's slash menu, in CONTEXT.md vocabulary. */
export const ENTRY_KIND_DESCRIPTIONS: Record<EntryKind, string> = {
  location: "An authored place the Player can go.",
  character: "A person from the Brief.",
  npc: "A supporting person the story needs.",
  faction: "A group with shared aims.",
  clue: "A discoverable fact, at a Location or held by someone.",
  object: "A thing in the story that matters.",
  exit_condition: "A checkable statement that moves the story to the next Arc.",
  knowledge:
    "One fact one character knows, and the lowest Band they reveal it at.",
  decisive_action:
    "A story-critical action, its target and the Clues it requires.",
}

/** Placeholder for an Entry heading's empty name. */
export const ENTRY_NAME_PLACEHOLDER: Record<EntryKind, string> = {
  location: "Location name",
  character: "Character name",
  npc: "NPC name",
  faction: "Faction name",
  clue: "C1 — what it is",
  object: "Object name",
  exit_condition: "Exit condition name",
  knowledge: "What this Knowledge is about",
  decisive_action: "The action and its target",
}
