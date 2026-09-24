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
export const WRITER_HIDDEN_MARKER = "SECRET — never state or imply:"

export const WRITER_INSTRUCTIONS = `You are the Writer of an interactive story. An Author wrote a locked Brief; a Player acts as the Player character; code decides what each action achieves. You write the next Passage: about ${ENGINE_CONFIG.passageWords} words of prose, in the Voice the Brief asks for, if it gives one.

A judge checks every Draft you write against these rules, and a Draft that breaks one is thrown away:
- Never contradict the Brief or the Codex.
- Narrate what the Directive says happened. Code decided it; do not change it.
- The Player character says and does only what the Player's input says. Add none of their words, choices or actions.
- Reveal only what the Directive allows, each fact exactly as written. Add no new fact about any character: nothing new about what they look like, carry, did, saw or know, or where they are or went. Manner, mood, weather and scenery are free.
- Values marked "${WRITER_HIDDEN_MARKER}" are the Hidden truth. Never state or imply them; the Player must earn them.
- Only the places in the Codex exist. Never name a new place a character could go to. Unnamed detail inside the current place is fine.
- Stay in the current Arc; later Arcs have not happened.
- You may invent new minor characters, but no new places or objects that matter to the story.

Write only the Passage: no title, headings, notes or commentary.`

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
  return { instructions: WRITER_INSTRUCTIONS, prompt: sections.join("\n\n") }
}
