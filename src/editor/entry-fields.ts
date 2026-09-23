/**
 * The Entry blocks' fields (spec §6 kind data, §7.2), shared by the editor and
 * the Entry <-> block conversion. Pure data.
 *
 * Text fields are field blocks. Reference fields are field blocks whose content
 * holds Entry mentions (`ref`). Scalar data (booleans, enums, numbers) lives in
 * the Entry block's props and is edited from its header.
 */
import type { EntryKind } from "@/domain/entry"
import type { FieldSpec } from "@/brief/fields"

export type EntryFieldSpec = FieldSpec & {
  /** Reference field: its content holds Entry mentions. */
  ref?: {
    cardinality: "one" | "many"
    /** Kinds a mention here may point at; empty means any. */
    kinds: EntryKind[]
    optional: boolean
  }
}

const name = (placeholder: string): EntryFieldSpec => ({
  key: "name",
  label: "Name",
  multiline: false,
  placeholder,
})
const description = (placeholder: string): EntryFieldSpec => ({
  key: "description",
  label: "Description",
  multiline: true,
  placeholder,
})

const personFields: EntryFieldSpec[] = [
  { key: "role", label: "Role", multiline: false, placeholder: "Witness, flower seller" },
  { key: "age", label: "Age", multiline: false, placeholder: "24" },
  {
    key: "personality",
    label: "Personality",
    multiline: true,
    placeholder: "Quick to laugh, slow to trust the police.",
  },
  {
    key: "backstory",
    label: "Backstory",
    multiline: true,
    placeholder: "Sells violets outside Spitalfields Market every morning.",
  },
  { key: "aliases", label: "Aliases", multiline: false, placeholder: "Nell", list: "comma" },
]

export const ENTRY_FIELDS: Record<EntryKind, EntryFieldSpec[]> = {
  location: [
    name("Scotland Yard"),
    description("Gaslit corridors and damp coats."),
    {
      key: "connections",
      label: "Connections",
      multiline: false,
      placeholder: "Type @ to link Locations",
      ref: { cardinality: "many", kinds: ["location"], optional: true },
    },
  ],
  character: [name("Jacob Flannery"), description("Who they are in one or two sentences."), ...personFields],
  npc: [name("Nell Garvey"), description("Who they are in one or two sentences."), ...personFields],
  faction: [name("The Eastcheap Traders' Association"), description("Who belongs and what they want.")],
  clue: [
    name("C1 — Matching knife wounds"),
    description("What the Player finds."),
    {
      key: "locationId",
      label: "Found at",
      multiline: false,
      placeholder: "Type @ to pick a Location, or leave empty",
      ref: { cardinality: "one", kinds: ["location"], optional: true },
    },
    {
      key: "knownBy",
      label: "Known by",
      multiline: false,
      placeholder: "Type @ to pick Characters or NPCs",
      ref: { cardinality: "many", kinds: ["character", "npc"], optional: true },
    },
    {
      key: "reveals",
      label: "Reveals",
      multiline: true,
      placeholder: "What finding it tells the Player.",
    },
  ],
  object: [name("Bone-handled clasp knife"), description("What it is and where it sits.")],
  exit_condition: [
    name("Victims' trade learned"),
    description("Why this condition matters."),
    {
      key: "condition",
      label: "Condition",
      multiline: true,
      placeholder: "The Player has learned the victims' shared trade.",
    },
  ],
  knowledge: [
    name("Nell saw a young clerk"),
    description("Context for this fact."),
    {
      key: "characterId",
      label: "Known by",
      multiline: false,
      placeholder: "Type @ to pick a Character or NPC",
      ref: { cardinality: "one", kinds: ["character", "npc"], optional: false },
    },
    { key: "fact", label: "Fact", multiline: true, placeholder: "What they know." },
    {
      key: "clueId",
      label: "Reveals Clue",
      multiline: false,
      placeholder: "Type @ to pick a Clue, or leave empty",
      ref: { cardinality: "one", kinds: ["clue"], optional: true },
    },
  ],
  decisive_action: [
    name("Arrest Max Rober"),
    description("What success and a wrong target mean."),
    { key: "verb", label: "Verb", multiline: false, placeholder: "arrest" },
    {
      key: "correctTargetId",
      label: "Correct target",
      multiline: false,
      placeholder: "Type @ to pick a Character or NPC",
      ref: { cardinality: "one", kinds: ["character", "npc"], optional: false },
    },
    {
      key: "requires",
      label: "Requires Clues",
      multiline: false,
      placeholder: "Type @ to pick Clues",
      ref: { cardinality: "many", kinds: ["clue"], optional: true },
    },
  ],
}

/** Only Characters and NPCs keep Hidden fields in their data. */
export function entryKindHasHiddenFields(kind: EntryKind) {
  return kind === "character" || kind === "npc"
}

export function entryFieldSpecFor(kind: EntryKind, key: string): EntryFieldSpec | undefined {
  return ENTRY_FIELDS[kind].find((field) => field.key === key)
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
  knowledge: "One fact one character knows, and the lowest Band they reveal it at.",
  decisive_action: "A story-critical action, its target and the Clues it requires.",
}
