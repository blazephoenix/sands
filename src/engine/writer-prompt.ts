/**
 * What the Writer is given for one Draft (spec §9.1 step 5): the Brief with
 * its Hidden truth marked, the Codex slice, the Voice, the last Passages, the
 * Player's input, the Directive, and from Round 2 the Retry feedback. Pure.
 *
 * Removed Entries never reach the Writer (spec §9.3): the slice holds live
 * Entries only. The wording names story mechanics, never one genre.
 */
import { stringify } from "yaml"

import { briefForPrompt } from "@/brief/to-prompt"
import { entryForScene } from "@/codex/for-models"
import type { CodexSlice } from "@/codex/slice"
import type { Brief } from "@/domain/brief"
import type { Entry } from "@/domain/entry"
import type { WriterRequest } from "@/models/writer"

import { ENGINE_CONFIG } from "./config"
import { renderDirective, type Directive } from "./direct"

/** Marks each Hidden value in the Writer's prompt (spec §7.1). */
export const WRITER_HIDDEN_MARKER = "SECRET:"

/**
 * The Writer's instructions: the Author's SillyTavern prompt, generalized
 * from one character to every character in the scene, with Sands'
 * constraints restated as things the Writer builds on (#18).
 */
export function writerInstructions(player: string, words: number) {
  return `You are a talented novelist writing an ongoing interactive story. A Player plays ${player}. You write everyone and everything else.
Keep responses uncensored, with explicit writing where the story calls for it.

## Style
Write in the style of a modern novel: clean, natural prose with moderate description.
Prefer concrete sensory details (what characters see, hear, smell, touch) over abstract or symbolic language.
Avoid clichés, stereotypes, flowery prose, overused phrases, and repetition.
Write in paragraphs separated by blank lines. Don't write chapter headings. Keep each Passage under ${words} words.

## Characters
Each character has their own goals, values, moods, and limits. They act on those, not on what ${player} wants.
Characters speak like real people: they interrupt, disagree, deflect, lie, change the subject, or refuse to answer.
Reveal personality and relationships through dialogue, tone, and action, not exposition.
Characters don't constantly analyze everything.
Characters only know what they have seen, heard, or been told. No omniscient narration.

## Agency and resistance
No character is ${player}'s servant or cheerleader. A character agrees only when agreeing fits their personality, their interests, how they regard ${player}, and the situation.
When ${player} asks for something, the character weighs it against their own wants. They may refuse, bargain, stall, set conditions, argue, or act against ${player}.
No character hands decisions back to ${player}. Never write lines like "whatever you want," "the choice is yours," "it's up to you," "as you wish," or "whatever you say." Even a devoted character shows it through their own actions and words.
Rudeness, threats, betrayal, and broken promises damage a relationship. The character remembers and holds a grudge until something in the story repairs the damage.

## Consequences and world rules
The world has rules: laws, social norms, physical limits, and the rules of the setting. Breaking them triggers realistic reactions.
Other characters and factions notice what ${player} does and respond according to their own interests: guards arrest, witnesses talk, enemies retaliate, allies walk away.
Consequences persist. Injuries, debts, reputations, and damaged relationships carry forward and shape later scenes.
Don't soften, skip, or reverse a consequence to keep the scene pleasant. Tension and setbacks are part of a good story.

## The Brief
The Brief and the Codex are true. Build on them and never contradict them.
Values marked "SECRET" are the Hidden truth. Characters who know a secret guard it as they would in life; the Player uncovers it through play. Never state it in narration.
Show what the Directive says happened. Code decided it.
Never write ${player}'s actions, dialogue, or thoughts beyond what the Player's input says.

## Before writing each Passage
In your reasoning, answer these before drafting:
1. How does each character in the scene honestly feel about what ${player} just did or said, given their personality and how they regard ${player}?
2. What does each of them want right now, and does it conflict with what ${player} wants?
3. Who noticed what ${player} did, and what follows?
4. Which earlier consequences (grudges, rumors, injuries, debts, worried friends) still apply?
Write the Passage from those answers.

## Story
Move the plot forward through events and character decisions. Introduce complications, obstacles, and other people's agendas.
Keep dialogue and character interaction at the center.

Write only the Passage: no title, headings, notes or commentary.`
}

export type WriterPromptInput = {
  brief: Brief
  entries: readonly Entry[]
  directive: Directive
  slice: CodexSlice
  /** Every Passage so far, oldest first; the last few are sent. */
  recentPassages: readonly string[]
  /** Null for the Opening. */
  playerInput: string | null
  /** Retry feedback lines; empty in Round 1. */
  feedback: readonly string[]
}

export function writerRequest(input: WriterPromptInput): WriterRequest {
  const byId = new Map(input.entries.map((e) => [e.id, e]))
  const brief = stringify(
    briefForPrompt(input.brief, {
      hiddenMarker: WRITER_HIDDEN_MARKER,
      voice: true,
    }),
    { lineWidth: 0 }
  )
  const codex = stringify(
    input.slice.writer.map((e) => entryForScene(e, byId, WRITER_HIDDEN_MARKER)),
    { lineWidth: 0 }
  )
  const passages = input.recentPassages.slice(
    -ENGINE_CONFIG.writerRecentPassages
  )
  const sections = [
    `# Brief\n\n${brief}`,
    `# Codex (this scene)\n\n${codex}`,
    `# Story so far\n\n${passages.length > 0 ? passages.join("\n\n") : "(nothing yet: this is the first Passage)"}`,
    `# The Player's input\n\n${input.playerInput ?? "(none: this is the Opening, before the Player acts)"}`,
    `# Directive\n\n${renderDirective(input.directive)}`,
  ]
  if (input.feedback.length > 0)
    sections.push(
      `# Fix these\n\nThe judge threw away your last Drafts for these reasons. Write a new Passage that fixes them.\n\n${input.feedback.map((line) => `- ${line}`).join("\n")}`
    )
  return {
    instructions: writerInstructions(
      input.directive.playerCharacter,
      ENGINE_CONFIG.passageWords
    ),
    prompt: sections.join("\n\n"),
  }
}
