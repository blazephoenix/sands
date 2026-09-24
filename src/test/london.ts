/**
 * Test data: the 1888 London case (docs/requirements.md §2) as a Brief
 * document, its validated Brief and the Codex setup would draft for it.
 * Used only by tests, never loaded by the app.
 *
 * The Codex comes in two variants:
 * - `review`: what setup drafted, mostly `proposed`, with Jev flags the Author
 *   has not dealt with yet, and one Entry already rejected.
 * - `ready`: the same Codex after review: accepted, edited and rejected Entries.
 * Author Entries (from the Brief) are `locked` in both.
 */
import { documentToBrief } from "@/brief/from-document"
import {
  briefSection,
  headingBlock,
  paragraphBlock,
  sequentialIds,
} from "@/brief/to-document"
import type { Brief } from "@/domain/brief"
import type {
  Entry,
  EntryData,
  EntryKind,
  EntrySource,
  EntryStatus,
  JevFlag,
} from "@/domain/entry"
import type { SandsBlock } from "@/editor/schema-config"
import { dayjs } from "@/lib/time"

const EPOCH = "2026-09-21T09:00:00.000Z"

/** A fixed timestamp `minutes` after the test epoch. */
export function testTime(minutes: number) {
  return dayjs(EPOCH).add(minutes, "minute").toISOString()
}

/**
 * The 1888 London Brief as a Brief editor document. `prefix` keeps block ids
 * unique per World. Custom fields and Hidden fields included: Max Rober's
 * backstory and motive are the Hidden truth.
 */
export function londonBriefDocument(prefix: string): SandsBlock[] {
  const ids = sequentialIds(`${prefix}-b`)
  const id = (name: string) => `${prefix}-${name}`
  return [
    ...briefSection(
      "setting",
      { place: "London", period: "Autumn 1888" },
      { ids, blockId: id("setting") }
    ),
    ...briefSection(
      "character",
      {
        name: "Jacob Flannery",
        role: "Detective, called over from New York for a special case",
        age: "38",
        personality:
          "Weary and sharp-eyed. Drinks more than he admits, and knows it.\nPatient with witnesses, impatient with rank.",
        backstory:
          "Three merchants have been killed in London in as many weeks. Scotland Yard has sent for an outsider with a reputation for difficult cases.\nHe left a daughter in Brooklyn and writes to her every Sunday.",
        aliases: ["The American", "Flannery"],
      },
      { ids, blockId: id("jacob"), isPlayer: true }
    ),
    ...briefSection(
      "character",
      {
        name: "Geoffrey James",
        role: "Police captain, Scotland Yard",
        age: "54",
        personality:
          "Gruff, proud of the Yard, protective of his men. Wants the case closed by Friday.",
        backstory:
          "Twenty-six years on the force. Resents that the Home Office sent for an American.",
        aliases: ["Captain James", "the Captain"],
      },
      { ids, blockId: id("geoffrey") }
    ),
    ...briefSection(
      "character",
      {
        name: "Amanda Hopkins",
        role: "Second in command",
        age: "41",
        personality: "Precise, dry-humoured, trusts evidence over rank.",
        backstory:
          "Kept the case files of all three killings. She suspects the victims were connected by trade.",
        aliases: ["Hopkins"],
      },
      { ids, blockId: id("amanda") }
    ),
    ...briefSection(
      "character",
      {
        name: "Thomas Whitlock",
        role: "Draper, first victim",
        age: "52",
        personality: "Genial and careless with money.",
        backstory: "Found in his shop on Whitechapel High Street.",
      },
      { ids, blockId: id("whitlock") }
    ),
    ...briefSection(
      "character",
      {
        name: "Edmund Carrow",
        role: "Tea merchant, second victim",
        age: "47",
        personality: "Pious in public, ruthless in business.",
        backstory:
          "Found at dawn outside his warehouse near Spitalfields Market.",
      },
      { ids, blockId: id("carrow") }
    ),
    ...briefSection(
      "character",
      {
        name: "Silas Pembury",
        role: "Ship's chandler, third victim",
        age: "60",
        personality: "Suspicious of everyone, kept meticulous accounts.",
        backstory: "Found on the quay at St Katharine Docks.",
      },
      { ids, blockId: id("pembury") }
    ),
    ...briefSection(
      "character",
      {
        name: "Max Rober",
        role: "Clerk at a shipping office",
        age: "21",
        personality:
          "Quiet, polite and meticulous. A cold fury under the courtesy.",
        backstory:
          "Son of Josiah Rober, a wool merchant who threw him and his mother out when he was fifteen. His mother died that winter.\nHe kills merchants as revenge against his father, and against every merchant who reminds him of him.",
        aliases: ["the clerk"],
      },
      {
        ids,
        blockId: id("max"),
        hiddenFields: ["backstory"],
        keyFacts: [
          {
            label: "Motive",
            text: "Revenge against his father, a merchant.",
            hidden: true,
          },
        ],
      }
    ),
    ...briefSection(
      "location",
      {
        name: "Scotland Yard",
        description:
          "Great Scotland Yard, Whitehall. Gaslit corridors, damp coats, a captain who wants results.",
      },
      { ids, blockId: id("yard") }
    ),
    ...briefSection(
      "arc",
      {
        name: "Introduction",
        description:
          "Jacob lands in London, meets the police and learns the state of the case.",
        exitConditions: ["Jacob has read the case file and met Captain James."],
      },
      { ids, blockId: id("arc-1") }
    ),
    ...briefSection(
      "arc",
      {
        name: "Midpoint",
        description:
          "The investigation begins. The Player discovers evidence and backstories.",
      },
      { ids, blockId: id("arc-2") }
    ),
    ...briefSection(
      "arc",
      { name: "End", description: "The killer is caught." },
      { ids, blockId: id("arc-3") }
    ),
    ...briefSection(
      "ending",
      { condition: "The killer is caught and arrested." },
      { ids, blockId: id("ending") }
    ),
    ...briefSection(
      "voice",
      {
        guidelines:
          "Close third person on Jacob. Short sentences. Fog, not gore: the killings are never shown on the page.",
        samplePassages:
          "The river smelled of coal and something older. Jacob turned up his collar and did not look at the body until he had to.",
      },
      { ids, blockId: id("voice") }
    ),
    headingBlock(id("notes"), "Notes for the Writer"),
    paragraphBlock(
      ids(),
      "The Yard is under pressure from the newspapers. Every constable has an opinion about the Irish dockers; none of them is right."
    ),
  ]
}

/** A Brief document and the validated Brief it converts to. Throws if the test data breaks §7.1. */
export function londonBrief(prefix: string): {
  briefDoc: SandsBlock[]
  brief: Brief
} {
  const briefDoc = londonBriefDocument(prefix)
  const { validation, issues } = documentToBrief(briefDoc)
  if (!validation.success)
    throw new Error(
      `The London Brief test data is invalid: ${issues.map((i) => i.message).join(" ")}`
    )
  return { briefDoc, brief: validation.brief }
}

export type Variant = "review" | "ready"

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
    const created = testTime(variant === "ready" ? 30 + index : 1470 + index)
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
          : testTime(variant === "ready" ? 90 : 1500),
    } as Entry
  })
}
