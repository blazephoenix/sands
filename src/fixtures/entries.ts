/**
 * Entries: fixture data and store operations.
 *
 * The London Codex for a World, in two variants:
 * - `review`: what setup drafted, mostly `proposed`, with Jev flags the Author
 *   has not dealt with yet, and one Entry already rejected.
 * - `ready`: the same Codex after review: accepted, edited and rejected Entries.
 * Author Entries (from the Brief) are `locked` in both. Session copies and
 * play Entries are built in `sessions.ts`.
 *
 * Every change to a World template Entry re-runs the solvability check
 * (spec §7.2, §8 step 4) and stores the result on the World, so
 * `GET /api/worlds/[id]` returns it and Start follows it.
 */
import type {
  CreateEntryRequest,
  PatchEntryRequest,
  PatchEntryResponse,
} from "@/domain/api"
import type { SolvabilityResult } from "@/domain/world"
import { checkSolvability } from "@/setup/solvability"
import {
  entryContentSchema,
  entrySchema,
  type Entry,
  type EntryData,
  type EntryKind,
  type EntrySource,
  type EntryStatus,
  type JevFlag,
} from "@/domain/entry"

import { getStore, newId, nowIso, StoreError } from "./store"
import { fixtureTime, WORLD_IDS } from "./ids"
import { getWorld, listWorldEntries, saveWorld } from "./worlds"

type Variant = "review" | "ready"

type Spec<K extends EntryKind> = {
  kind: K
  key: string
  name: string
  description: string
  data: EntryData<K>
  source: EntrySource
  /** Status per variant. */
  status: EntryStatus | Record<Variant, EntryStatus>
  keyFacts?: string[]
  jevFlags?: JevFlag[]
  /** Data the Author changed in a variant (an `edited` Entry), over `data`. */
  editedData?: Partial<Record<Variant, Partial<EntryData<K>>>>
}

/**
 * The London Codex. `key`s are stable handles; ids are `${prefix}-${key}`, and
 * references in `data` use keys, resolved per World by `londonEntries`.
 */
function londonSpecs(): Spec<EntryKind>[] {
  const person = (
    role: string,
    age: string,
    personality: string,
    backstory: string,
    extra: Partial<EntryData<"character">> = {}
  ) => ({
    role,
    age,
    personality,
    backstory,
    isPlayer: false,
    hiddenFields: [],
    aliases: [],
    ...extra,
  })

  return [
    // Author: locked Entries parsed from the Brief (spec §8 step 1).
    {
      kind: "character",
      key: "jacob",
      name: "Jacob Flannery",
      description:
        "A weary American detective called over for the merchant killings.",
      data: person(
        "Detective, called over from New York",
        "38",
        "Weary and sharp-eyed. Drinks more than he admits.",
        "Sent for after three merchants died in as many weeks.",
        { isPlayer: true, aliases: ["The American", "Flannery"] }
      ),
      source: "author",
      status: "locked",
    },
    {
      kind: "character",
      key: "geoffrey",
      name: "Geoffrey James",
      description: "Captain at Scotland Yard, proud and impatient.",
      data: person(
        "Police captain",
        "54",
        "Gruff, proud of the Yard, protective of his men.",
        "Twenty-six years on the force.",
        { aliases: ["Captain James"] }
      ),
      source: "author",
      status: "locked",
    },
    {
      kind: "character",
      key: "amanda",
      name: "Amanda Hopkins",
      description: "Second in command; keeps the case files.",
      data: person(
        "Second in command",
        "41",
        "Precise, dry-humoured, trusts evidence over rank.",
        "Suspects the victims were connected by trade."
      ),
      source: "author",
      status: "locked",
    },
    {
      kind: "character",
      key: "max",
      name: "Max Rober",
      description: "A quiet clerk at a shipping office.",
      data: person(
        "Clerk at a shipping office",
        "21",
        "Quiet, polite and meticulous. A cold fury under the courtesy.",
        "Son of Josiah Rober, who threw him and his mother out. Kills merchants as revenge against his father.",
        { hiddenFields: ["backstory", "Motive"], aliases: ["the clerk"] }
      ),
      source: "author",
      status: "locked",
      keyFacts: ["Motive: Revenge against his father, a merchant."],
    },
    {
      kind: "location",
      key: "yard",
      name: "Scotland Yard",
      description:
        "Great Scotland Yard, Whitehall. Gaslit corridors and damp coats.",
      data: { connections: ["whitechapel"], isStart: true },
      source: "author",
      status: "locked",
    },
    {
      kind: "exit_condition",
      key: "exit-1",
      name: "Case file read",
      description: "From the Brief's first Arc.",
      data: {
        arcIndex: 0,
        condition: "Jacob has read the case file and met Captain James.",
      },
      source: "author",
      status: "locked",
    },

    // Setup: World call.
    {
      kind: "location",
      key: "whitechapel",
      name: "Whitechapel High Street",
      description:
        "Market stalls, costermongers and the draper's shop where Whitlock died.",
      data: { connections: ["yard", "spitalfields", "docks"], isStart: false },
      source: "setup",
      status: { review: "proposed", ready: "accepted" },
    },
    {
      kind: "location",
      key: "spitalfields",
      name: "Spitalfields Market",
      description:
        "The covered market, busy before dawn. Carrow's warehouse stands on its edge.",
      data: { connections: ["whitechapel"], isStart: false },
      source: "setup",
      status: { review: "proposed", ready: "accepted" },
    },
    {
      kind: "location",
      key: "docks",
      name: "St Katharine Docks",
      description:
        "Warehouses of wool, tea and ivory beside the Tower. Pembury's chandlery faces the quay.",
      data: { connections: ["whitechapel", "tower-bridge"], isStart: false },
      source: "setup",
      status: { review: "proposed", ready: "edited" },
    },
    {
      kind: "location",
      key: "tower-bridge",
      name: "Tower Bridge",
      description: "The new bascule bridge beside the Tower of London.",
      data: { connections: ["docks"], isStart: false },
      source: "setup",
      status: { review: "proposed", ready: "rejected" },
      jevFlags: [
        {
          question: "period_fit",
          prompt: "Does Tower Bridge fit a story set in London in autumn 1888?",
          probability: 0.86,
          verdict: "fail",
        },
      ],
    },
    {
      kind: "npc",
      key: "nell",
      name: "Nell Garvey",
      description:
        "A flower seller outside Spitalfields Market who sees everything at dawn.",
      data: person(
        "Flower seller, witness",
        "24",
        "Quick to laugh, slow to trust the police.",
        "Sells violets outside the market every morning.",
        { aliases: ["Nell"] }
      ),
      source: "setup",
      status: { review: "proposed", ready: "accepted" },
    },
    {
      kind: "npc",
      key: "pryce",
      name: "Dr. Henry Pryce",
      description: "The police surgeon who examined all three bodies.",
      data: person(
        "Police surgeon",
        "58",
        "Dry, exact, fond of the American's bluntness.",
        "Has examined the dead for the Yard for twenty years."
      ),
      source: "setup",
      status: { review: "accepted", ready: "accepted" },
    },
    {
      kind: "npc",
      key: "josiah",
      name: "Josiah Rober",
      description:
        "A wool merchant with a warehouse at St Katharine Docks. Max's father.",
      data: person(
        "Wool merchant",
        "56",
        "Proud, hard, ashamed of nothing.",
        "Disowned his son six years ago and never speaks of him."
      ),
      source: "setup",
      status: { review: "proposed", ready: "proposed" },
    },
    {
      kind: "npc",
      key: "finch",
      name: "Walter Finch",
      description: "Max's fellow clerk, who covers for his absences.",
      data: person(
        "Shipping clerk",
        "23",
        "Nervous and loyal.",
        "Shares a desk with Max and suspects nothing."
      ),
      source: "setup",
      status: { review: "proposed", ready: "accepted" },
      jevFlags: [
        {
          question: "contradiction",
          prompt: "Does Walter Finch contradict the Brief?",
          probability: 0.44,
          verdict: "flagged",
        },
      ],
    },
    {
      kind: "npc",
      key: "abberline",
      name: "Inspector Frederick Abberline",
      description:
        "A Metropolitan Police inspector leading the Whitechapel inquiries.",
      data: person(
        "Inspector",
        "45",
        "Methodical.",
        "Leads the Whitechapel inquiries."
      ),
      source: "setup",
      status: "rejected",
      jevFlags: [
        {
          question: "contradiction",
          prompt: "Does Inspector Frederick Abberline contradict the Brief?",
          probability: 0.58,
          verdict: "fail",
        },
      ],
    },
    {
      kind: "faction",
      key: "traders",
      name: "The Eastcheap Traders' Association",
      description:
        "Merchants who lend to one another. All three victims were members; so is Josiah Rober.",
      data: {},
      source: "setup",
      status: { review: "proposed", ready: "accepted" },
    },
    {
      kind: "object",
      key: "ledger",
      name: "Rober & Sons ledger",
      description: "Josiah Rober's account book, kept in his warehouse office.",
      data: {},
      source: "setup",
      status: { review: "proposed", ready: "accepted" },
    },

    // Setup: Story logic call.
    {
      kind: "clue",
      key: "c1",
      name: "C1 — Matching knife wounds",
      description: "Dr. Pryce's notes on the three bodies.",
      data: {
        locationId: null,
        knownBy: ["pryce"],
        reveals:
          "All three were killed with the same short, hooked blade, by a right-handed man of middling height.",
        pointsToHidden: true,
        redHerring: false,
      },
      source: "setup",
      status: { review: "proposed", ready: "accepted" },
    },
    {
      kind: "clue",
      key: "c2",
      name: "C2 — A torn ledger page",
      description: "Caught on a nail near Pembury's chandlery.",
      data: {
        locationId: "docks",
        knownBy: [],
        reveals:
          "A page from the Rober & Sons ledger listing all three victims as creditors.",
        pointsToHidden: true,
        redHerring: false,
      },
      source: "setup",
      status: { review: "proposed", ready: "accepted" },
    },
    {
      kind: "clue",
      key: "c3",
      name: "C3 — The young clerk at dawn",
      description: "What Nell saw the morning Carrow died.",
      data: {
        locationId: null,
        knownBy: ["nell"],
        reveals:
          "A young man in a clerk's coat left Carrow's warehouse just before dawn.",
        pointsToHidden: true,
        redHerring: false,
      },
      source: "setup",
      status: { review: "proposed", ready: "accepted" },
    },
    {
      kind: "clue",
      key: "c4",
      name: "C4 — A cufflink engraved J.R.",
      description: "Found in the straw behind Carrow's warehouse.",
      data: {
        locationId: "spitalfields",
        knownBy: [],
        reveals:
          "A silver cufflink engraved J.R.: Josiah Rober's, pawned by his son last winter.",
        pointsToHidden: true,
        redHerring: false,
      },
      source: "setup",
      status: { review: "proposed", ready: "edited" },
    },
    {
      kind: "clue",
      key: "c5",
      name: "C5 — An Irish docker's cap",
      description: "A red herring the constables love.",
      data: {
        locationId: "whitechapel",
        knownBy: [],
        reveals:
          "A docker's cap near Whitlock's shop. It belongs to a man who was in a cell that night.",
        pointsToHidden: false,
        redHerring: true,
      },
      source: "setup",
      status: { review: "proposed", ready: "accepted" },
    },
    {
      kind: "knowledge",
      key: "k-nell",
      name: "Nell saw the clerk",
      description: "She will talk to a policeman who treats her fairly.",
      data: {
        characterId: "nell",
        fact: "She saw a young clerk leave Carrow's warehouse at dawn.",
        minBand: "normal",
        clueId: "c3",
      },
      source: "setup",
      status: { review: "proposed", ready: "accepted" },
    },
    {
      kind: "knowledge",
      key: "k-pryce",
      name: "Pryce on the wounds",
      description: "He tells anyone from the Yard.",
      data: {
        characterId: "pryce",
        fact: "The same blade killed all three men.",
        minBand: "low",
        clueId: "c1",
      },
      source: "setup",
      status: { review: "proposed", ready: "accepted" },
    },
    {
      kind: "knowledge",
      key: "k-amanda",
      name: "Amanda on the victims' trade",
      description: "From her case files.",
      data: {
        characterId: "amanda",
        fact: "All three victims lent money to Rober & Sons.",
        minBand: "low",
        clueId: null,
      },
      source: "setup",
      status: { review: "proposed", ready: "accepted" },
    },
    {
      kind: "knowledge",
      key: "k-josiah",
      name: "Josiah disowned his son",
      description: "He admits it only to someone he respects.",
      data: {
        characterId: "josiah",
        fact: "He threw his son Max out six years ago.",
        minBand: "high",
        clueId: null,
      },
      source: "setup",
      status: { review: "proposed", ready: "proposed" },
    },
    {
      kind: "exit_condition",
      key: "exit-2",
      name: "Victims' trade learned",
      description: "Drafted for the Midpoint Arc.",
      data: {
        arcIndex: 1,
        condition:
          "Jacob has learned the victims' shared trade and visited at least one crime scene.",
      },
      source: "setup",
      status: { review: "proposed", ready: "accepted" },
    },
    {
      kind: "exit_condition",
      key: "exit-3",
      name: "Max Rober arrested",
      description: "Drafted from the Ending.",
      data: { arcIndex: 2, condition: "Max Rober has been arrested." },
      source: "setup",
      status: { review: "proposed", ready: "accepted" },
    },
    // Setup drafts the arrest to need every Clue it lists, so in review
    // removing any of C1-C4 fails solvability. In the ready World the Author
    // edited it down to any three of the four.
    {
      kind: "decisive_action",
      key: "arrest-max",
      name: "Arrest Max Rober",
      description:
        "Arresting the killer wins; arresting anyone else, or too early, costs Reputation.",
      data: {
        verb: "arrest",
        correctTargetId: "max",
        requires: ["c1", "c2", "c3", "c4"],
        requiresCount: null,
        onSuccess: "win",
        wrongTargetPenalty: 15,
        prematurePenalty: 20,
      },
      editedData: { ready: { requiresCount: 3 } },
      source: "setup",
      status: { review: "proposed", ready: "edited" },
    },
  ] as Spec<EntryKind>[]
}

const REF_FIELDS = [
  "connections",
  "locationId",
  "knownBy",
  "characterId",
  "clueId",
  "correctTargetId",
  "requires",
]

/** The London Codex for one World: `prefix-key` ids, references resolved. */
export function londonEntries(
  worldId: string,
  prefix: string,
  variant: Variant
): Entry[] {
  const id = (key: string) => `${prefix}-${key}`
  return londonSpecs().map((spec, index) => {
    const data: Record<string, unknown> = {
      ...spec.data,
      ...spec.editedData?.[variant],
    }
    for (const field of REF_FIELDS) {
      const value = data[field]
      if (Array.isArray(value))
        data[field] = value.map((key: string) => id(key))
      else if (typeof value === "string") data[field] = id(value)
    }
    const status =
      typeof spec.status === "string" ? spec.status : spec.status[variant]
    const created = fixtureTime(variant === "ready" ? 30 + index : 1470 + index)
    return {
      id: id(spec.key),
      worldId,
      sessionId: null,
      templateId: null,
      kind: spec.kind,
      name: spec.name,
      description: spec.description,
      keyFacts: spec.keyFacts ?? [],
      data,
      source: spec.source,
      sourceTurn: null,
      status,
      jevFlags: spec.jevFlags ?? [],
      seenAt: null,
      createdAt: created,
      updatedAt:
        status === "proposed" || status === "locked"
          ? created
          : fixtureTime(variant === "ready" ? 90 : 1500),
    } as Entry
  })
}

export function seedEntries(): Entry[] {
  // Session copies and play Entries are seeded by sessions.ts, alongside their Sessions.
  return [
    ...londonEntries(WORLD_IDS.ready, "mk", "ready"),
    ...londonEntries(WORLD_IDS.review, "wc", "review"),
  ]
}

// Operations

export function getEntry(id: string): Entry {
  const entry = getStore().entries.get(id)
  if (!entry)
    throw new StoreError(
      "not_found",
      `There is no Entry "${id}". Reload to see the current Codex.`
    )
  return entry
}

export function listSessionEntries(sessionId: string): Entry[] {
  return [...getStore().entries.values()].filter(
    (entry) => entry.sessionId === sessionId
  )
}

export function saveEntry(entry: Entry): Entry {
  const parsed = entrySchema.parse(entry)
  getStore().entries.set(parsed.id, parsed)
  return parsed
}

/**
 * Re-runs the solvability check over a World's template Entries and stores
 * the result on the World. Only a World past setup has a result to keep: a
 * World in draft has no Entries yet, and while setup runs (drafting) setup
 * owns the check. For those, the stored result comes back unchanged.
 */
export function recheckSolvability(worldId: string): SolvabilityResult | null {
  const world = getWorld(worldId)
  if (
    !world.brief ||
    (world.setupStatus !== "review" && world.setupStatus !== "ready")
  )
    return world.solvability
  const checkedAt = nowIso()
  const solvability: SolvabilityResult = {
    ...checkSolvability({
      arcs: world.brief.arcs,
      entries: listWorldEntries(world.id),
    }),
    checkedAt,
  }
  saveWorld({ ...world, solvability, updatedAt: checkedAt })
  return solvability
}

/**
 * Accept, reject, restore, edit or mark-seen one Entry (World template or
 * Session copy). Locked Entries come from the Brief and cannot change.
 *
 * `solvability` in the result: for a World template Entry, the World's result
 * re-checked after this change and stored (mark-seen changes nothing the check
 * reads, so it returns the stored result); for a Session copy, null, since
 * Session edits take effect from the next Turn.
 */
export function patchEntry(
  id: string,
  request: PatchEntryRequest
): PatchEntryResponse {
  const entry = getEntry(id)
  if (entry.status === "locked") {
    throw new StoreError(
      "conflict",
      `${entry.name || "This Entry"} comes from the Brief and is locked. Change it in the Brief instead.`
    )
  }
  const updatedAt = nowIso()
  let next: Entry
  switch (request.action) {
    case "accept":
      next = { ...entry, status: "accepted", updatedAt }
      break
    case "reject":
      next = { ...entry, status: "rejected", updatedAt }
      break
    case "restore":
      next = { ...entry, status: request.status, updatedAt }
      break
    case "edit": {
      if (request.content.kind !== entry.kind) {
        throw new StoreError(
          "invalid",
          `This Entry is a ${entry.kind.replaceAll("_", " ")}, not a ${request.content.kind.replaceAll("_", " ")}.`
        )
      }
      next = {
        ...entry,
        ...request.content,
        status: "edited",
        updatedAt,
      } as Entry
      break
    }
    case "mark-seen":
      next = { ...entry, seenAt: entry.seenAt ?? updatedAt }
      break
  }
  const saved = saveEntry(next)
  if (saved.sessionId !== null) return { entry: saved, solvability: null }
  const solvability =
    request.action === "mark-seen"
      ? getWorld(saved.worldId).solvability
      : recheckSolvability(saved.worldId)
  return { entry: saved, solvability }
}

/** Stores an Entry the Author added in the Entry editor; a World Entry re-checks solvability, as `patchEntry` does. */
export function createEntry(request: CreateEntryRequest): PatchEntryResponse {
  const world = getWorld(request.worldId)
  if (request.sessionId !== null) {
    const session = getStore().sessions.get(request.sessionId)
    if (!session || session.worldId !== world.id) {
      throw new StoreError(
        "not_found",
        `There is no Session "${request.sessionId}" in this World.`
      )
    }
  }
  const content = entryContentSchema.parse(request.content)
  const now = nowIso()
  const saved = saveEntry({
    ...content,
    id: newId("entry"),
    worldId: world.id,
    sessionId: request.sessionId,
    templateId: null,
    source: "author",
    sourceTurn: null,
    status: "accepted",
    jevFlags: [],
    seenAt: null,
    createdAt: now,
    updatedAt: now,
  } as Entry)
  return {
    entry: saved,
    solvability: saved.sessionId === null ? recheckSolvability(world.id) : null,
  }
}
