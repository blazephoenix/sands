/**
 * The typed Brief blocks and their fields (spec §7.1), in one catalog shared by
 * the editor (labels, placeholders, slash menu) and the conversion.
 *
 * Pure data: no React, no BlockNote runtime.
 */

export const BRIEF_BLOCK_TYPES = [
  "setting",
  "character",
  "arc",
  "ending",
  "location",
  "voice",
] as const
export type BriefBlockType = (typeof BRIEF_BLOCK_TYPES)[number]

export function isBriefBlockType(type: string): type is BriefBlockType {
  return (BRIEF_BLOCK_TYPES as readonly string[]).includes(type)
}

/** The key custom (Author-labelled) field blocks carry. */
export const CUSTOM_FIELD_KEY = "custom"

export type FieldSpec = {
  /** Stable key, also the Brief property it fills. */
  key: string
  label: string
  /** Multi-paragraph fields take Enter as a new paragraph; single-line fields move on. */
  multiline: boolean
  /** Shown in an empty field, in the 1888 example's style. */
  placeholder: string
  /** How the text becomes a list, for list-valued properties. */
  list?: "lines" | "comma"
}

export type BriefBlockSpec = {
  type: BriefBlockType
  title: string
  /** One line for the slash menu, in CONTEXT.md vocabulary. */
  description: string
  aliases: string[]
  fields: FieldSpec[]
}

export const BRIEF_BLOCKS: Record<BriefBlockType, BriefBlockSpec> = {
  setting: {
    type: "setting",
    title: "Setting",
    description: "Where and when the story takes place.",
    aliases: ["setting", "place", "period", "era"],
    fields: [
      { key: "place", label: "Place", multiline: false, placeholder: "London" },
      { key: "period", label: "Period", multiline: false, placeholder: "Autumn 1888" },
    ],
  },
  character: {
    type: "character",
    title: "Character",
    description: "A person in the story. Mark one as the Player character.",
    aliases: ["character", "person", "player", "npc"],
    fields: [
      { key: "name", label: "Name", multiline: false, placeholder: "Jacob Flannery" },
      { key: "role", label: "Role", multiline: false, placeholder: "Detective, called over from New York" },
      { key: "age", label: "Age", multiline: false, placeholder: "38" },
      {
        key: "personality",
        label: "Personality",
        multiline: true,
        placeholder: "Weary and sharp-eyed. Drinks more than he admits.",
      },
      {
        key: "backstory",
        label: "Backstory",
        multiline: true,
        placeholder: "Sent for after three merchants were killed in as many weeks.",
      },
      {
        key: "aliases",
        label: "Aliases",
        multiline: false,
        placeholder: "The American, Flannery",
        list: "comma",
      },
    ],
  },
  arc: {
    type: "arc",
    title: "Arc",
    description: "One ordered phase of the story. Document order is Arc order.",
    aliases: ["arc", "phase", "act", "chapter"],
    fields: [
      { key: "name", label: "Name", multiline: false, placeholder: "Introduction" },
      {
        key: "description",
        label: "Description",
        multiline: true,
        placeholder: "Jacob lands in London, meets the police and learns the state of the case.",
      },
      {
        key: "exitConditions",
        label: "Exit conditions",
        multiline: true,
        placeholder: "One per line. Jacob has read the case file and met Captain James.",
        list: "lines",
      },
    ],
  },
  ending: {
    type: "ending",
    title: "Ending",
    description: "The win condition that ends the story.",
    aliases: ["ending", "win", "goal", "end"],
    fields: [
      {
        key: "condition",
        label: "Win condition",
        multiline: true,
        placeholder: "The killer is caught.",
      },
    ],
  },
  location: {
    type: "location",
    title: "Location",
    description: "An authored place the Player can go. Optional.",
    aliases: ["location", "place", "map"],
    fields: [
      { key: "name", label: "Name", multiline: false, placeholder: "Scotland Yard" },
      {
        key: "description",
        label: "Description",
        multiline: true,
        placeholder: "Gaslit corridors, damp coats, a captain who wants results by Friday.",
      },
    ],
  },
  voice: {
    type: "voice",
    title: "Voice",
    description: "How the prose should sound, as guidelines or sample passages. Optional.",
    aliases: ["voice", "tone", "style", "prose"],
    fields: [
      {
        key: "guidelines",
        label: "Guidelines",
        multiline: true,
        placeholder: "Close third person on Jacob. Short sentences. Fog, not gore.",
      },
      {
        key: "samplePassages",
        label: "Sample passages",
        multiline: true,
        placeholder: "The river smelled of coal and something older.",
      },
    ],
  },
}

/** Placeholder for a new custom field's text. */
export const CUSTOM_FIELD_PLACEHOLDER = "What should the Writer know?"

export function fieldSpecFor(blockType: string, key: string): FieldSpec | undefined {
  if (!isBriefBlockType(blockType)) return undefined
  return BRIEF_BLOCKS[blockType].fields.find((field) => field.key === key)
}
