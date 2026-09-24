/**
 * Judge validation of drafted Entries (spec §8 step 3): one Judge call with
 * two Nouls per drafted Entry, "does it conflict with the Brief?" and "is it
 * out of place in the setting?". A failed or Unsure answer becomes a flag on
 * the Entry for the Author; nothing is deleted.
 *
 * The smoke test found these two checks the Judge's weakest (research §2),
 * so each question follows the research's advice: the Entry sits beside its
 * question in structured instructions, one condition per Noul, and the
 * `false` criterion spells out what does not count. Nothing assumes a genre
 * or a period: the setting is whatever the Brief says it is.
 *
 * Yes means a problem, as with every Rule question; the fail and Unsure
 * thresholds are the Rules' (`ruleVerdict`, spec §10.1).
 */
import { briefForPrompt } from "@/brief/to-prompt"
import type { Brief } from "@/domain/brief"
import { ENTRY_KIND_LABELS, type Entry, type JevFlag } from "@/domain/entry"
import { ruleVerdict } from "@/engine/config"
import {
  noul,
  type Judge,
  type JudgeJson,
  type NoulQuestion,
} from "@/models/judge"

import { HIDDEN_MARKER } from "./drafter-calls"

const CONFLICT_CRITERIA = {
  true: "The Entry states or implies something the Brief makes false: a different name, role, age, relationship, place, time or event for something the Brief describes, or a fact that cannot be true if the Brief is true.",
  false:
    "Everything in the Entry can be true alongside the Brief. Details the Brief does not mention are not conflicts, and neither are additions that build on the Brief without changing it. A Clue marked red_herring is meant to mislead: what it seems to suggest is not a conflict.",
}

const SETTING_CRITERIA = {
  true: "Something in the Entry could not exist or happen in the place and time `brief.setting` describes: an object, a technology, an institution, a custom, a title or a way of life the setting does not have.",
  false:
    "Everything in the Entry could exist in the place and time `brief.setting` describes, including things the setting allows but does not mention. Judge only against the setting, not against the rest of the Brief.",
}

/** An Entry as the Judge reads it: its fields, with references as names. */
export function entryForJudge(
  entry: Entry,
  byId: ReadonlyMap<string, Entry>
): { [key: string]: JudgeJson } {
  const name = (id: string | null) => (id ? (byId.get(id)?.name ?? "") : "")
  const names = (ids: readonly string[]) => ids.map(name).filter(Boolean)
  const base: { [key: string]: JudgeJson } = {
    kind: ENTRY_KIND_LABELS[entry.kind].singular,
    name: entry.name,
  }
  if (entry.description.trim()) base.description = entry.description.trim()
  if (entry.keyFacts.length > 0) base.key_facts = entry.keyFacts
  switch (entry.kind) {
    case "location":
      return { ...base, connections: names(entry.data.connections) }
    case "character":
    case "npc":
      return {
        ...base,
        role: entry.data.role,
        age: entry.data.age,
        personality: entry.data.personality,
        backstory: entry.data.backstory,
        aliases: entry.data.aliases,
      }
    case "clue":
      return {
        ...base,
        found_at: name(entry.data.locationId) || null,
        known_by: names(entry.data.knownBy),
        reveals: entry.data.reveals,
        red_herring: entry.data.redHerring,
      }
    case "knowledge":
      return {
        ...base,
        character: name(entry.data.characterId),
        fact: entry.data.fact,
      }
    case "decisive_action":
      return {
        ...base,
        verb: entry.data.verb,
        target: name(entry.data.correctTargetId),
      }
    case "exit_condition":
      return {
        ...base,
        arc: entry.data.arcIndex + 1,
        condition: entry.data.condition,
      }
    default:
      return base
  }
}

function hasSetting(brief: Brief) {
  return brief.settings.some(
    (s) => s.place.trim() || s.period.trim() || s.keyFacts.length > 0
  )
}

type Asked = { entryId: string; question: JevFlag["question"]; prompt: string }

/**
 * Asks the Judge about `entries` (the drafted ones) and returns them, in the
 * same order, with their flags set. `codex` is every Entry the drafted ones
 * may refer to. Makes no call when there is nothing to ask.
 */
export async function validateEntries(
  judge: Judge,
  input: { brief: Brief; entries: readonly Entry[]; codex: readonly Entry[] },
  options: { signal?: AbortSignal } = {}
): Promise<{ entries: Entry[]; model: string | null }> {
  const { brief, entries, codex } = input
  if (entries.length === 0) return { entries: [], model: null }

  const byId = new Map([...codex, ...entries].map((e) => [e.id, e]))
  const withSetting = hasSetting(brief)
  const questions: Record<string, NoulQuestion> = {}
  const asked = new Map<string, Asked>()
  entries.forEach((entry, index) => {
    const shown = entryForJudge(entry, byId)
    const label = entry.name.trim() || "This Entry"
    questions[`contradiction_${index}`] = noul(
      {
        question: "Does this Entry conflict with the Brief in `brief`?",
        entry: shown,
      },
      CONFLICT_CRITERIA
    )
    asked.set(`contradiction_${index}`, {
      entryId: entry.id,
      question: "contradiction",
      prompt: `Does ${label} conflict with the Brief?`,
    })
    if (!withSetting) return
    questions[`setting_${index}`] = noul(
      {
        question:
          "Is this Entry out of place in the story's setting, `brief.setting`?",
        entry: shown,
      },
      SETTING_CRITERIA
    )
    asked.set(`setting_${index}`, {
      entryId: entry.id,
      question: "period_fit",
      prompt: `Is ${label} out of place in the setting?`,
    })
  })

  const result = await judge.ask(
    {
      state: {
        brief: briefForPrompt(brief, { hiddenMarker: HIDDEN_MARKER }),
      } as { [key: string]: JudgeJson },
      questions,
    },
    options
  )

  const flags = new Map<string, JevFlag[]>()
  for (const [id, answer] of Object.entries(result.answers)) {
    const { entryId, question, prompt } = asked.get(id)!
    const { failed, unsure } = ruleVerdict(answer.noul)
    if (!failed && !unsure) continue
    flags.set(entryId, [
      ...(flags.get(entryId) ?? []),
      {
        question,
        prompt,
        probability: answer.noul,
        verdict: failed ? "fail" : "flagged",
      },
    ])
  }
  return {
    entries: entries.map((entry) => ({
      ...entry,
      jevFlags: flags.get(entry.id) ?? [],
    })),
    model: result.model,
  }
}
