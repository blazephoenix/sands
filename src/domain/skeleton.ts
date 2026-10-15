/**
 * The Skeleton (CONTEXT.md): the Author's description of a story, in the
 * format of issue #24 with the glossary's names. Everything here is text the
 * Writer reads; code reads only the Title, the Player character, the Arcs'
 * names and the Endings (to end a Session on one of them).
 *
 * Text fields may carry Hidden text: the parts the Author marked as not to be
 * told, wrapped in `<hidden>…</hidden>` (see `./hidden-text`). Multi-line
 * values separate lines with "\n".
 *
 * Any object that parses is a Skeleton, however unfinished: an empty field is
 * "". Whether it can be played is `checkSkeleton`'s question, not the
 * schema's, so the editor can save a half-written Skeleton.
 */
import { z } from "zod"

const text = z.string()

export const ENDING_KINDS = ["good", "bad", "neutral"] as const
export type EndingKind = (typeof ENDING_KINDS)[number]

export const storySchema = z.object({
  title: text,
  premise: text,
  genre: text,
  theme: text,
  /** Where the whole story takes place. */
  setting: text,
  period: text,
  /** "Original", or the work the story is based on. */
  basedOn: text,
})

export const playSettingsSchema = z.object({
  /** The name of the character the Player controls; must match a character's name. */
  playerCharacter: text,
  pointOfView: text,
  /** How the story opens: the Opening's scene and situation. */
  opening: text,
  offscreenScenes: text,
  /** How far the Player's input may state its own results. */
  claims: text,
})

/** One character's relationship to another, one-way. */
export const tieSchema = z.object({
  /** The other character's name. */
  toward: text,
  /** What this character wants from them. */
  wants: text,
  friction: text,
  /** Where the Tie stands when play begins. */
  startsAs: text,
})
export type Tie = z.infer<typeof tieSchema>

export const characterSchema = z.object({
  name: text,
  aliases: text,
  role: text,
  core: text,
  want: text,
  wantPriority: text,
  fearOrWeakness: text,
  /** Things this character will never do, one per line. */
  lines: text,
  speech: text,
  knows: text,
  believes: text,
  ties: z.array(tieSchema),
})
export type Character = z.infer<typeof characterSchema>

export const placeSchema = z.object({
  name: text,
  description: text,
  connectsTo: text,
  whatHappensHere: text,
})
export type Place = z.infer<typeof placeSchema>

export const worldRuleSchema = z.object({
  rule: text,
  allows: text,
  costOrLimit: text,
  cannotDo: text,
  exceptions: text,
})
export type WorldRule = z.infer<typeof worldRuleSchema>

export const promiseSchema = z.object({
  promise: text,
  setup: text,
  payoff: text,
  /** An Arc's name. */
  earliestArc: text,
})
/** Named for the glossary's Promise; `Promise` alone would shadow the global. */
export type SkeletonPromise = z.infer<typeof promiseSchema>

/** One character's plan for one Arc. */
export const agendaSchema = z.object({
  /** The character's name. */
  character: text,
  /** Their want for this Arc. */
  want: text,
  /** Ordered Steps, one per line. */
  steps: text,
  ifBlocked: text,
})
export type Agenda = z.infer<typeof agendaSchema>

export const arcSchema = z.object({
  name: text,
  description: text,
  function: text,
  setPieces: text,
  mustLandMoments: text,
  stakes: text,
  ifLandedEarly: text,
  agendas: z.array(agendaSchema),
})
export type Arc = z.infer<typeof arcSchema>

/** One row of the Hidden truth. */
export const secretSchema = z.object({
  secret: text,
  whoKnows: text,
  howItSurfaces: text,
  /** An Arc's name. */
  earliestArc: text,
  whatPlayerCanDo: text,
})
export type Secret = z.infer<typeof secretSchema>

export const endingSchema = z.object({
  name: text,
  /** One of `ENDING_KINDS` once the Skeleton is playable; free text while it is written. */
  kind: text,
  trigger: text,
  /** An Arc's name. */
  earliestArc: text,
})
export type Ending = z.infer<typeof endingSchema>

export const stateFlagSchema = z.object({
  flag: text,
  /** The flag's values, one per line. */
  values: text,
  /** One Epilogue line per value, one per line, in the order of `values`. */
  epilogue: text,
})
export type StateFlag = z.infer<typeof stateFlagSchema>

export const voiceAndCanonSchema = z.object({
  voice: text,
  samplePassage: text,
  fixedFacts: text,
  writerMayInvent: text,
  writerMustNotInvent: text,
  pacing: text,
  /** The Author's Prose bans. */
  never: text,
})

export const skeletonSchema = z.object({
  story: storySchema,
  playSettings: playSettingsSchema,
  characters: z.array(characterSchema),
  places: z.array(placeSchema),
  worldRules: z.array(worldRuleSchema),
  promises: z.array(promiseSchema),
  arcs: z.array(arcSchema),
  secrets: z.array(secretSchema),
  endings: z.array(endingSchema),
  writerMayInventEndings: z.boolean(),
  stateFlags: z.array(stateFlagSchema),
  voiceAndCanon: voiceAndCanonSchema,
})
export type Skeleton = z.infer<typeof skeletonSchema>

/** A Skeleton with every field empty and no rows. */
export function emptySkeleton(): Skeleton {
  return {
    story: {
      title: "",
      premise: "",
      genre: "",
      theme: "",
      setting: "",
      period: "",
      basedOn: "",
    },
    playSettings: {
      playerCharacter: "",
      pointOfView: "",
      opening: "",
      offscreenScenes: "",
      claims: "",
    },
    characters: [],
    places: [],
    worldRules: [],
    promises: [],
    arcs: [],
    secrets: [],
    endings: [],
    writerMayInventEndings: false,
    stateFlags: [],
    voiceAndCanon: {
      voice: "",
      samplePassage: "",
      fixedFacts: "",
      writerMayInvent: "",
      writerMustNotInvent: "",
      pacing: "",
      never: "",
    },
  }
}
