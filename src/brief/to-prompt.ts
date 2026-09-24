/**
 * The Brief as models read it (spec §5.1: Brief -> YAML for prompts). Pure.
 *
 * `briefForPrompt` builds a plain object in snake_case, the shape the Judge
 * state and the Drafter prompts use; `briefToYaml` renders it. Empty fields
 * are left out, so a sparse Brief stays short. Every Hidden field's value
 * starts with the caller's marker, because who may see the Hidden truth
 * differs by reader: the Drafter needs it to place Clues, the Writer must
 * never state it.
 */
import { stringify } from "yaml"

import type { Brief, KeyFact } from "@/domain/brief"

export type BriefPromptOptions = {
  /** Put in front of every Hidden value, e.g. "[HIDDEN]". */
  hiddenMarker: string
  /** Include the Voice sections. Only prose writers and judges need them. */
  voice?: boolean
}

type Item = { hiddenFields: string[]; keyFacts: KeyFact[] }
type Out = Record<string, unknown>

export function briefForPrompt(brief: Brief, options: BriefPromptOptions) {
  const mark = (text: string) => `${options.hiddenMarker} ${text}`

  /** The item's non-empty fields, in the order given, Hidden ones marked, then its custom fields. */
  function fields(
    item: Item,
    typed: Record<string, [key: string, value: string | string[] | boolean]>
  ): Out {
    const out: Out = {}
    for (const [field, [key, value]] of Object.entries(typed)) {
      if (typeof value === "boolean") {
        if (value) out[key] = true
        continue
      }
      const text = Array.isArray(value) ? value.join(", ") : value.trim()
      if (!text) continue
      out[key] = item.hiddenFields.includes(field) ? mark(text) : text
    }
    const custom: Out = {}
    for (const fact of item.keyFacts) {
      if (!fact.text.trim()) continue
      custom[fact.label.trim() || "note"] = fact.hidden
        ? mark(fact.text.trim())
        : fact.text.trim()
    }
    if (Object.keys(custom).length > 0) out.other_fields = custom
    return out
  }

  const prompt: Out = {}
  const settings = brief.settings.map((s) =>
    fields(s, { place: ["place", s.place], period: ["period", s.period] })
  )
  if (settings.length > 0) prompt.setting = settings
  prompt.characters = brief.characters.map((c) =>
    fields(c, {
      name: ["name", c.name],
      isPlayer: ["player_character", c.isPlayer],
      role: ["role", c.role],
      age: ["age", c.age],
      personality: ["personality", c.personality],
      backstory: ["backstory", c.backstory],
      aliases: ["aliases", c.aliases],
    })
  )
  if (brief.locations.length > 0) {
    prompt.locations = brief.locations.map((l) =>
      fields(l, {
        name: ["name", l.name],
        description: ["description", l.description],
      })
    )
  }
  prompt.arcs = brief.arcs.map((a, index) => ({
    arc: index + 1,
    ...fields(a, {
      name: ["name", a.name],
      description: ["description", a.description],
      exitConditions: ["exit_conditions", a.exitConditions.join("\n")],
    }),
  }))
  prompt.ending = fields(brief.ending, {
    condition: ["condition", brief.ending.condition],
  })
  if (options.voice && brief.voices.length > 0) {
    prompt.voice = brief.voices.map((v) =>
      fields(v, {
        guidelines: ["guidelines", v.guidelines],
        samplePassages: ["sample_passages", v.samplePassages],
      })
    )
  }
  const notes = brief.prose
    .map((section) => ({
      ...(section.heading ? { heading: section.heading } : {}),
      text: section.paragraphs.join("\n").trim(),
    }))
    .filter((section) => section.text)
  if (notes.length > 0) prompt.notes = notes
  return prompt
}

export function briefToYaml(brief: Brief, options: BriefPromptOptions) {
  return stringify(briefForPrompt(brief, options), { lineWidth: 0 })
}
