/**
 * Setup's two Drafter calls (spec §8 step 2): what each asks for, as a zod
 * schema, and the instructions and prompt it is sent with. Pure.
 *
 * 1. The World call drafts Locations with their connections, supporting NPCs
 *    and Exit conditions for Arcs that lack them.
 * 2. The Story logic call sees the World call's output and drafts Clues,
 *    Knowledge and Decisive actions. On a retry it also sees its previous
 *    draft and the Gaps found in it (spec §8 step 3).
 *
 * The Drafter refers to things by name and to Clues by key; code resolves
 * the names to Entries (`resolve.ts`). The schemas follow OpenAI's strict
 * structured outputs: every field required, `.nullable()` for "none"
 * (docs/research/2026-09-24-engine-libraries.md §4). Field names are
 * snake_case, like every model-facing shape (spec §10.2). Numbers are plain
 * `number`s, rounded in code: zod's `.int()` adds safe-integer bounds to the
 * JSON schema, which strict mode need not accept.
 *
 * The wording is genre-agnostic (spec §1): it names story mechanics, never
 * one kind of story.
 */
import { stringify } from "yaml"
import { z } from "zod"

import { briefToYaml } from "@/brief/to-prompt"
import type { Brief } from "@/domain/brief"
import { isLiveEntry, type Entry, type EntryOfKind } from "@/domain/entry"
import type { SolvabilityGap } from "@/domain/world"
import type { DrafterRequest } from "@/models/drafter"

/** Marks the Hidden truth in the Drafter's copy of the Brief. */
export const HIDDEN_MARKER = "[HIDDEN]"

const text = (description: string) => z.string().describe(description)

const exitConditionDraft = z.object({
  arc: z.number().describe("The Arc's number, from `arcs`, a whole number."),
  name: text("A short name, a few words."),
  condition: text(
    "A checkable statement about what has happened in the story."
  ),
})

export const worldCallSchema = z.object({
  locations: z.array(
    z.object({
      name: text("The place's name."),
      description: text("One to three sentences."),
      connections: z
        .array(z.string())
        .describe(
          "Exact names of the Locations one can go to directly from here."
        ),
    })
  ),
  npcs: z.array(
    z.object({
      name: text("Their full name."),
      description: text("One sentence."),
      role: text("Their place in the story."),
      age: z.string(),
      personality: z.string(),
      backstory: z.string(),
      aliases: z.array(z.string()).describe("Other names they go by."),
    })
  ),
  exit_conditions: z.array(exitConditionDraft),
})
export type WorldDraft = z.infer<typeof worldCallSchema>

export const storyLogicCallSchema = z.object({
  clues: z.array(
    z.object({
      key: text("C1, C2, C3 and so on, unique."),
      title: text("A short title."),
      description: text("One sentence."),
      location: z
        .string()
        .nullable()
        .describe("Exact name of the Location where it can be found, or null."),
      known_by: z
        .array(z.string())
        .describe("Exact names of the characters who know it."),
      reveals: text("What finding it tells the Player."),
      points_to_hidden_truth: z.boolean(),
      red_herring: z.boolean(),
    })
  ),
  knowledge: z.array(
    z.object({
      name: text("A short name."),
      description: text("One sentence: when or why they tell it."),
      character: text("Exact name of the character who knows it."),
      fact: text("The fact, as they would give it up."),
      min_band: z
        .enum(["low", "normal", "high"])
        .describe("The lowest Band at which they reveal it."),
      clue: z
        .string()
        .nullable()
        .describe("The key of the Clue this fact is, or null."),
    })
  ),
  decisive_actions: z.array(
    z.object({
      name: text("A short name, such as the verb and the target."),
      description: text("One sentence: what success means."),
      verb: text("The action, in the Brief's own terms."),
      target: text("Exact name of the character it is done to."),
      requires: z.array(z.string()).describe("Keys of the Clues it needs."),
      clues_needed: z
        .number()
        .nullable()
        .describe(
          "How many of `requires` suffice, a whole number, or null for all."
        ),
      on_success: z
        .enum(["win", "none"])
        .describe("win when success wins the story, none when play goes on."),
    })
  ),
  exit_conditions: z
    .array(exitConditionDraft)
    .describe(
      "Only for Arcs in `arcs_without_exit_conditions`; usually empty."
    ),
})
export type StoryLogicDraft = z.infer<typeof storyLogicCallSchema>

export const WORLD_CALL_INSTRUCTIONS = `You set up an interactive story from an Author's Brief. The Brief is locked: never contradict it or change it, and never draft one of its characters or Locations again as a new one. Everything you draft is a proposal the Author reviews before play.

Draft three things:

1. Locations: 3 to 4 new places where the story happens, fitting the Brief's setting (its place and its time). When the setting is a real place and time, use real places that existed then. Give each a name, a description of one to three sentences, and its connections: the names of the Locations one can go to directly from it. A connection may name a Brief Location or a new one. Every Location must be reachable from the start location through connections.
2. NPCs: 2 to 5 supporting characters the Arcs need and the Brief does not have. Give each a full name, a one-sentence description, a role, an age, a personality, a backstory, and any other names they go by as aliases.
3. Exit conditions: for each Arc listed in \`arcs_without_exit_conditions\`, one or two checkable statements about what has happened in the story that, once true, let the story move on to the next Arc. Give each the Arc's number, a short name and the condition. Draft none for other Arcs.

Values marked ${HIDDEN_MARKER} in the Brief are the Hidden truth: the Player must earn it through play. Places and people may serve the Hidden truth, but no description may state it.

Refer to the Brief's characters and Locations by their exact names.`

export const STORY_LOGIC_CALL_INSTRUCTIONS = `You set up the story logic of an interactive story: the conditions code enforces so that the story can be won. You get the Author's locked Brief and the Codex: every character and Location in the World, and how the Locations connect. Never contradict the Brief. Everything you draft is a proposal the Author reviews before play.

Draft three things:

1. Clues: facts the Player can discover. Give each a key (C1, C2, C3 and so on), a short title, a one-sentence description and what it reveals. Place it at a Location, or give it to the characters who know it, or both. Set points_to_hidden_truth when it points towards the Hidden truth. A Clue meant to mislead is a red herring: set red_herring, and never let a red herring point to the Hidden truth.
2. Knowledge: one fact one character knows, and the lowest Band at which they reveal it: low (they tell anyone), normal (they tell someone who treats them fairly) or high (they tell only someone they trust). When the fact is a Clue, give the Clue's key. A Clue that only characters know can be found only through Knowledge that reveals it.
3. Decisive actions: the story-critical actions the Brief's Ending calls for. Give each a name, a one-sentence description, its verb (the action, in the Brief's own terms), its target (the character it is done to), the keys of the Clues it requires, clues_needed (how many of those Clues suffice, or null for all of them) and on_success: win when success wins the story, none when play goes on.

The story must be solvable:
- At least one Decisive action wins the story.
- A Clue a Decisive action requires is never a red herring, and is reachable: at a Location the Player can reach from the start location through connections, or revealed by a character's Knowledge at low or normal Band.
- Every Arc has an Exit condition. Draft Exit conditions only for Arcs listed in \`arcs_without_exit_conditions\`, if any.

Values marked ${HIDDEN_MARKER} in the Brief are the Hidden truth: the Player must earn it through play, so the Clues that point to it are what the Player finds.

Refer to characters and Locations by their exact names in the Codex, and to Clues by their keys. Never use a name the Codex does not have.`

/** Arcs with no live Exit condition among these Entries, as the Drafter sees them. */
export function arcsWithoutExitConditions(
  brief: Brief,
  entries: readonly Entry[]
) {
  const covered = new Set(
    entries
      .filter(
        (e): e is EntryOfKind<"exit_condition"> =>
          e.kind === "exit_condition" && isLiveEntry(e)
      )
      .map((e) => e.data.arcIndex)
  )
  return brief.arcs
    .map((arc, index) => ({ arc: index + 1, name: arc.name.trim() }))
    .filter((arc) => !covered.has(arc.arc - 1))
}

function names(entries: readonly Entry[], kinds: readonly Entry["kind"][]) {
  return entries.filter((e) => kinds.includes(e.kind)).map((e) => e.name)
}

export function worldCallRequest(
  brief: Brief,
  authorEntries: readonly Entry[]
): DrafterRequest<WorldDraft> {
  const start = authorEntries.find(
    (e) => e.kind === "location" && e.data.isStart
  )
  const prompt = {
    brief_locations: names(authorEntries, ["location"]),
    brief_characters: names(authorEntries, ["character"]),
    start_location:
      start?.name ?? "The first Location you draft is the start location.",
    arcs_without_exit_conditions: arcsWithoutExitConditions(
      brief,
      authorEntries
    ),
  }
  return {
    call: "world_call",
    instructions: WORLD_CALL_INSTRUCTIONS,
    prompt: `# Brief\n\n${briefToYaml(brief, { hiddenMarker: HIDDEN_MARKER })}\n# World so far\n\n${stringify(prompt, { lineWidth: 0 })}`,
    schema: worldCallSchema,
  }
}

/** The Codex as the Story logic call reads it: names, how Locations connect (both ways), and the Exit conditions. */
export function codexForPrompt(entries: readonly Entry[]) {
  const live = entries.filter(isLiveEntry)
  const byId = new Map(live.map((e) => [e.id, e]))
  const locations = live.filter(
    (e): e is EntryOfKind<"location"> => e.kind === "location"
  )
  const links = new Map(locations.map((l) => [l.id, new Set<string>()]))
  for (const location of locations) {
    for (const other of location.data.connections) {
      if (!links.has(other) || other === location.id) continue
      links.get(location.id)!.add(other)
      links.get(other)!.add(location.id)
    }
  }
  const people = live.filter(
    (e): e is EntryOfKind<"character" | "npc"> =>
      e.kind === "character" || e.kind === "npc"
  )
  return {
    characters: people.map((p) => ({
      name: p.name,
      ...(p.data.isPlayer ? { player_character: true } : {}),
      ...(p.data.role.trim() ? { role: p.data.role.trim() } : {}),
      ...(p.data.aliases.length > 0 ? { aliases: p.data.aliases } : {}),
      ...(p.kind === "npc" && p.description.trim()
        ? { description: p.description.trim() }
        : {}),
    })),
    locations: locations.map((l) => ({
      name: l.name,
      ...(l.data.isStart ? { start_location: true } : {}),
      ...(l.description.trim() ? { description: l.description.trim() } : {}),
      connections: [...links.get(l.id)!].map((id) => byId.get(id)!.name),
    })),
    exit_conditions: live
      .filter(
        (e): e is EntryOfKind<"exit_condition"> => e.kind === "exit_condition"
      )
      .map((e) => ({ arc: e.data.arcIndex + 1, condition: e.data.condition })),
  }
}

export type StoryLogicRetry = {
  previous: StoryLogicDraft
  gaps: readonly SolvabilityGap[]
}

export function storyLogicCallRequest(
  brief: Brief,
  codex: readonly Entry[],
  retry: StoryLogicRetry | null
): DrafterRequest<StoryLogicDraft> {
  const world = {
    codex: codexForPrompt(codex),
    arcs_without_exit_conditions: arcsWithoutExitConditions(brief, codex),
  }
  let prompt = `# Brief\n\n${briefToYaml(brief, { hiddenMarker: HIDDEN_MARKER })}\n# World\n\n${stringify(world, { lineWidth: 0 })}`
  if (retry) {
    const feedback = {
      problems: retry.gaps.map((gap) => gap.message),
      previous_draft: retry.previous,
    }
    prompt += `\n# Fix your previous draft\n\nCode checked your previous draft and found the problems below. Return a complete corrected draft, not only the changes, that fixes every problem and keeps what already worked.\n\n${stringify(feedback, { lineWidth: 0 })}`
  }
  return {
    call: "story_logic_call",
    instructions: STORY_LOGIC_CALL_INSTRUCTIONS,
    prompt,
    schema: storyLogicCallSchema,
  }
}
