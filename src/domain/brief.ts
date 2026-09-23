/**
 * The Brief: the Author's locked description of a story (CONTEXT.md, spec §7.1).
 *
 * A Brief is produced by converting the Brief editor's BlockNote document
 * (`src/brief/from-document.ts`): section headings followed by `Label: value`
 * paragraphs. Every item keeps the id of the section heading it came from, so
 * a validation issue can point the editor at the right block.
 *
 * Two shapes:
 * - `BriefDraft`: whatever the document holds, possibly invalid (several
 *   Endings, no player Character, ...). The live preview and the validation
 *   summary work from this.
 * - `Brief`: a draft that passed the §7.1 rules. This is what `brief_json`
 *   stores and what setup reads.
 *
 * Field text is multi-paragraph: paragraphs are separated by "\n".
 */
import { z } from "zod"

/** A custom, Author-labelled field on a typed block. Becomes an Entry's `keyFacts`. */
export const keyFactSchema = z.object({
  label: z.string(),
  text: z.string(),
  hidden: z.boolean(),
})
export type KeyFact = z.infer<typeof keyFactSchema>

const briefItemBase = {
  /** Id of the section heading block in the Brief document. */
  blockId: z.string().min(1),
  /** Author-labelled custom fields, in document order. */
  keyFacts: z.array(keyFactSchema),
  /** Keys of the typed fields the Author marked Hidden, including `name` (custom fields carry their own flag). */
  hiddenFields: z.array(z.string()),
}

export const briefSettingSchema = z.object({
  ...briefItemBase,
  place: z.string(),
  period: z.string(),
})
export type BriefSetting = z.infer<typeof briefSettingSchema>

export const briefCharacterSchema = z.object({
  ...briefItemBase,
  name: z.string(),
  role: z.string(),
  age: z.string(),
  personality: z.string(),
  backstory: z.string(),
  aliases: z.array(z.string()),
  isPlayer: z.boolean(),
})
export type BriefCharacter = z.infer<typeof briefCharacterSchema>

export const briefArcSchema = z.object({
  ...briefItemBase,
  name: z.string(),
  description: z.string(),
  /** One Exit condition per line. Optional: setup drafts them for Arcs that lack them. */
  exitConditions: z.array(z.string()),
})
export type BriefArc = z.infer<typeof briefArcSchema>

export const briefEndingSchema = z.object({
  ...briefItemBase,
  /** The win condition, for example "the killer is caught". */
  condition: z.string(),
})
export type BriefEnding = z.infer<typeof briefEndingSchema>

export const briefLocationSchema = z.object({
  ...briefItemBase,
  name: z.string(),
  description: z.string(),
})
export type BriefLocation = z.infer<typeof briefLocationSchema>

export const briefVoiceSchema = z.object({
  ...briefItemBase,
  guidelines: z.string(),
  samplePassages: z.string(),
})
export type BriefVoice = z.infer<typeof briefVoiceSchema>

/**
 * Free prose outside typed blocks, grouped under its nearest preceding heading
 * (`heading: null` for prose before the first heading). Locked text that only
 * the Writer and the Judge read; code cannot act on it (ADR-0002).
 */
export const briefProseSectionSchema = z.object({
  heading: z.string().nullable(),
  /** Id of the heading block, or null for prose before the first heading. */
  headingBlockId: z.string().nullable(),
  paragraphs: z.array(z.string()),
})
export type BriefProseSection = z.infer<typeof briefProseSectionSchema>

const briefCollections = {
  /** A Brief may describe more than one place and period, for example a frame story. */
  settings: z.array(briefSettingSchema),
  characters: z.array(briefCharacterSchema),
  /** Document order is Arc order. */
  arcs: z.array(briefArcSchema),
  locations: z.array(briefLocationSchema),
  voices: z.array(briefVoiceSchema),
  prose: z.array(briefProseSectionSchema),
}

export const briefDraftSchema = z.object({
  ...briefCollections,
  endings: z.array(briefEndingSchema),
})
export type BriefDraft = z.infer<typeof briefDraftSchema>

export const briefSchema = z.object({
  ...briefCollections,
  ending: briefEndingSchema,
})
export type Brief = z.infer<typeof briefSchema>

/** Which §7.1 rule an issue breaks. */
export const briefIssueCodeSchema = z.enum([
  "no_player_character",
  "several_player_characters",
  "character_unnamed",
  "no_arc",
  "no_ending",
  "several_endings",
])
export type BriefIssueCode = z.infer<typeof briefIssueCodeSchema>

/**
 * One validation problem, precise enough for the editor to highlight it.
 * `blockId` is the section heading at fault; it is null only for
 * document-level problems with no block to point at (no Arc, no Ending, no
 * Character at all). `field` is the typed field key (`name` for the heading's
 * name, `isPlayer` for the Player character mark), or null when the whole
 * section is at fault. `fieldBlockId` is the block to focus: the field's
 * `Label: value` paragraph, or the heading itself for its name.
 */
export const briefIssueSchema = z.object({
  code: briefIssueCodeSchema,
  message: z.string(),
  blockId: z.string().nullable(),
  field: z.string().nullable(),
  fieldBlockId: z.string().nullable(),
})
export type BriefIssue = z.infer<typeof briefIssueSchema>

type IssueParams = Omit<BriefIssue, "message">

/**
 * Something the Author probably wants to fix but that does not block setup: a
 * label that looks like a typo for a known one, or a section without a name.
 */
export const briefWarningSchema = z.object({
  code: z.enum(["probable_typo", "unnamed_section"]),
  message: z.string(),
  /** The block to highlight: the field paragraph, or the heading. */
  blockId: z.string(),
  /** For a probable typo: the label as typed. */
  field: z.string().nullable(),
  /** For a probable typo: the known label it resembles. */
  suggestion: z.string().nullable(),
})
export type BriefWarning = z.infer<typeof briefWarningSchema>

/**
 * The §7.1 rules as a zod refinement: exactly one player Character, at least
 * one Arc, exactly one Ending, every Character named. Each zod issue carries the
 * block id and field in `params`, which `validateBriefDraft` turns into
 * `BriefIssue`s.
 */
export const briefRulesSchema = briefDraftSchema.superRefine((draft, ctx) => {
  const add = (message: string, params: IssueParams) =>
    ctx.addIssue({ code: "custom", message, params, input: draft })

  const players = draft.characters.filter((c) => c.isPlayer)
  if (draft.characters.length === 0) {
    add("Add a Character and mark them as the Player character.", {
      code: "no_player_character",
      blockId: null,
      field: null,
      fieldBlockId: null,
    })
  } else if (players.length === 0) {
    add("Mark one Character as the Player character.", {
      code: "no_player_character",
      blockId: draft.characters[0].blockId,
      field: "isPlayer",
      fieldBlockId: null,
    })
  } else if (players.length > 1) {
    for (const extra of players.slice(1)) {
      add(
        `Only one Character can be the Player character. ${labelOf(extra)} is marked too.`,
        {
          code: "several_player_characters",
          blockId: extra.blockId,
          field: "isPlayer",
          fieldBlockId: null,
        }
      )
    }
  }

  for (const character of draft.characters) {
    if (character.name.trim() === "") {
      add("Every Character needs a name.", {
        code: "character_unnamed",
        blockId: character.blockId,
        field: "name",
        fieldBlockId: character.blockId,
      })
    }
  }

  if (draft.arcs.length === 0) {
    add("Add at least one Arc.", {
      code: "no_arc",
      blockId: null,
      field: null,
      fieldBlockId: null,
    })
  }

  if (draft.endings.length === 0) {
    add("Add an Ending that names the win condition.", {
      code: "no_ending",
      blockId: null,
      field: null,
      fieldBlockId: null,
    })
  } else if (draft.endings.length > 1) {
    for (const extra of draft.endings.slice(1)) {
      add(
        "A Brief has exactly one Ending. Merge this one into the first or delete it.",
        {
          code: "several_endings",
          blockId: extra.blockId,
          field: null,
          fieldBlockId: null,
        }
      )
    }
  }
})

function labelOf(character: BriefCharacter) {
  return character.name.trim() || "An unnamed Character"
}

export type BriefValidation =
  | { success: true; brief: Brief; issues: [] }
  | { success: false; brief: null; issues: BriefIssue[] }

/**
 * Validates a draft against the §7.1 rules. `fieldBlockIds` maps
 * `blockId -> field key -> field block id` so issues can point at the exact
 * field block; conversion supplies it.
 */
export function validateBriefDraft(
  draft: BriefDraft,
  fieldBlockIds: Record<string, Record<string, string>> = {}
): BriefValidation {
  const result = briefRulesSchema.safeParse(draft)
  if (result.success) {
    const { endings, ...rest } = result.data
    return { success: true, brief: { ...rest, ending: endings[0] }, issues: [] }
  }

  const issues = result.error.issues.map((issue): BriefIssue => {
    const params = (issue as { params?: Partial<IssueParams> }).params
    if (!params?.code) {
      // A structural problem, not a §7.1 rule: the draft itself is malformed.
      throw new Error(
        `Malformed Brief draft at ${issue.path.join(".")}: ${issue.message}`
      )
    }
    const blockId = params.blockId ?? null
    const field = params.field ?? null
    return {
      code: params.code,
      message: issue.message,
      blockId,
      field,
      fieldBlockId:
        params.fieldBlockId ??
        (blockId && field ? (fieldBlockIds[blockId]?.[field] ?? null) : null),
    }
  })
  return { success: false, brief: null, issues }
}

/** Every Hidden field of a Brief, taken together (CONTEXT.md: Hidden truth). */
export function hiddenTruth(
  brief: Brief | BriefDraft
): { blockId: string; field: string; text: string }[] {
  const out: { blockId: string; field: string; text: string }[] = []
  const items: (Record<string, unknown> & {
    blockId: string
    hiddenFields: string[]
    keyFacts: KeyFact[]
  })[] = [
    ...brief.settings,
    ...brief.characters,
    ...brief.arcs,
    ...("ending" in brief ? [brief.ending] : brief.endings),
    ...brief.locations,
    ...brief.voices,
  ]
  for (const item of items) {
    for (const field of item.hiddenFields) {
      const value = item[field]
      out.push({
        blockId: item.blockId,
        field,
        text: Array.isArray(value) ? value.join("\n") : String(value ?? ""),
      })
    }
    for (const fact of item.keyFacts) {
      if (fact.hidden)
        out.push({ blockId: item.blockId, field: fact.label, text: fact.text })
    }
  }
  return out
}
