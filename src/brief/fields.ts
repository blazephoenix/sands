/**
 * The Brief's section kinds and their known field labels (spec §7.1), shared by
 * the editor (slash menu, templates, hints) and the conversion. Pure data.
 *
 * A section is a heading block (`setting`, `character`, ...) followed by
 * `Label: value` paragraphs. Labels match case-insensitively; any other label
 * is a custom field and becomes a key fact.
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

export type FieldSpec = {
  /** Stable key, also the property it fills. */
  key: string
  /** The label as written in the document. */
  label: string
  /** Other spellings that count as this field (plurals). */
  aliases?: string[]
  /** How the value becomes a list, for list-valued properties. */
  list?: "lines" | "comma"
  /** Shown after an empty `Label:`. Says what belongs there without assuming a genre. */
  placeholder: string
}

export type BriefBlockSpec = {
  type: BriefBlockType
  title: string
  /** One line for the slash menu, in CONTEXT.md vocabulary. */
  description: string
  aliases: string[]
  /** Named sections carry their name as the heading's text. */
  named: boolean
  /** Placeholder for an empty name. */
  namePlaceholder: string
  fields: FieldSpec[]
}

export const BRIEF_BLOCKS: Record<BriefBlockType, BriefBlockSpec> = {
  setting: {
    type: "setting",
    title: "Setting",
    description: "Where and when the story takes place.",
    aliases: ["setting", "place", "period", "era"],
    named: false,
    namePlaceholder: "",
    fields: [
      { key: "place", label: "Place", placeholder: "Where the story happens" },
      { key: "period", label: "Period", placeholder: "When it happens" },
    ],
  },
  character: {
    type: "character",
    title: "Character",
    description: "A person in the story. Mark one as the Player character.",
    aliases: ["character", "person", "player", "npc"],
    named: true,
    namePlaceholder: "Character name",
    fields: [
      {
        key: "role",
        label: "Role",
        placeholder: "Their place in the story",
      },
      { key: "age", label: "Age", placeholder: "How old they are" },
      {
        key: "personality",
        label: "Personality",
        placeholder: "How they think, speak and act",
      },
      {
        key: "backstory",
        label: "Backstory",
        placeholder: "What happened to them before the story",
      },
      {
        key: "aliases",
        label: "Aliases",
        aliases: ["Alias"],
        list: "comma",
        placeholder: "Other names they go by, comma-separated",
      },
    ],
  },
  arc: {
    type: "arc",
    title: "Arc",
    description: "One ordered phase of the story. Document order is Arc order.",
    aliases: ["arc", "phase", "act", "chapter"],
    named: true,
    namePlaceholder: "Arc name",
    fields: [
      {
        key: "description",
        label: "Description",
        placeholder: "What happens in this part of the story",
      },
      {
        key: "exitConditions",
        label: "Exit condition",
        aliases: ["Exit conditions"],
        list: "lines",
        placeholder:
          "What must be true before the story moves on. (Optional; one per line.)",
      },
    ],
  },
  ending: {
    type: "ending",
    title: "Ending",
    description: "The win condition that ends the story.",
    aliases: ["ending", "win", "goal", "end"],
    named: false,
    namePlaceholder: "",
    fields: [
      {
        key: "condition",
        label: "Condition",
        aliases: ["Win condition"],
        placeholder: "What must happen for the story to be won",
      },
    ],
  },
  location: {
    type: "location",
    title: "Location",
    description: "An authored place the Player can go. Optional.",
    aliases: ["location", "place", "map"],
    named: true,
    namePlaceholder: "Location name",
    fields: [
      {
        key: "description",
        label: "Description",
        placeholder: "What the place is like, and who is found there",
      },
    ],
  },
  voice: {
    type: "voice",
    title: "Voice",
    description:
      "How the prose should sound, as guidelines or sample passages. Optional.",
    aliases: ["voice", "tone", "style", "prose"],
    named: false,
    namePlaceholder: "",
    fields: [
      {
        key: "guidelines",
        label: "Guidelines",
        aliases: ["Guideline"],
        placeholder: "Point of view, tense, rhythm, what to avoid",
      },
      {
        key: "samplePassages",
        label: "Sample passage",
        aliases: ["Sample passages"],
        placeholder: "A few lines written the way the story should sound",
      },
    ],
  },
}

export function fieldSpecFor(
  blockType: string,
  key: string
): FieldSpec | undefined {
  if (!isBriefBlockType(blockType)) return undefined
  return BRIEF_BLOCKS[blockType].fields.find((field) => field.key === key)
}
