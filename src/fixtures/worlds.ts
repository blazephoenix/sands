/**
 * Worlds and Briefs: fixture data and store operations.
 *
 * Four Worlds, one per setup status, all built on the 1888 London case
 * (docs/requirements.md §2):
 * - `w-merchant-killings` ready: reviewed, played, with Sessions of every kind.
 * - `w-whitechapel`      review: setup has drafted Entries the Author has not reviewed.
 * - `w-thames-ledger`    drafting: setup is running.
 * - `w-fog`              draft: a half-written Brief that does not pass §7.1 yet.
 *
 * Ticket 02's operations (list, create, save the Brief) are at the end.
 */
import { documentToBrief } from "@/brief/from-document"
import {
  briefSection,
  headingBlock,
  newBriefTemplate,
  paragraphBlock,
  randomId,
  sequentialIds,
} from "@/brief/to-document"
import type { SessionSummary, WorldSummary } from "@/domain/api"
import type { Brief } from "@/domain/brief"
import type { Entry } from "@/domain/entry"
import type { SolvabilityResult, World } from "@/domain/world"
import type { SandsBlock } from "@/editor/schema-config"

import { fixtureTime, WORLD_IDS } from "./ids"
import { getStore, newId, nowIso, StoreError } from "./store"

export { WORLD_IDS } from "./ids"

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

/** A Brief document and the validated Brief it converts to. Throws if the fixture breaks §7.1. */
export function londonBrief(prefix: string): {
  briefDoc: SandsBlock[]
  brief: Brief
} {
  const briefDoc = londonBriefDocument(prefix)
  const { validation, issues } = documentToBrief(briefDoc)
  if (!validation.success)
    throw new Error(
      `London Brief fixture is invalid: ${issues.map((i) => i.message).join(" ")}`
    )
  return { briefDoc, brief: validation.brief }
}

/** A Brief in progress: the Setting and the player Character are filled in, the Arcs and Ending are not yet. */
function draftBriefDocument(): SandsBlock[] {
  const ids = sequentialIds("fog-b")
  return [
    ...briefSection(
      "setting",
      { place: "London", period: "Winter 1888" },
      { ids, blockId: "fog-setting" }
    ),
    ...briefSection(
      "character",
      {
        name: "Jacob Flannery",
        role: "Detective",
        personality: "Weary and sharp-eyed.",
      },
      { ids, blockId: "fog-jacob", isPlayer: true }
    ),
    ...briefSection(
      "character",
      { role: "The killer" },
      { ids, blockId: "fog-unnamed" }
    ),
    paragraphBlock(ids(), ""),
  ]
}

const PASSED: SolvabilityResult = {
  passed: true,
  gaps: [],
  checkedAt: fixtureTime(60),
}

export function seedWorlds(): World[] {
  const ready = londonBrief("mk")
  const review = londonBrief("wc")
  const drafting = londonBrief("tl")
  return [
    {
      id: WORLD_IDS.ready,
      name: "The Merchant Killings",
      briefDoc: ready.briefDoc,
      brief: ready.brief,
      setupStatus: "ready",
      solvability: PASSED,
      createdAt: fixtureTime(0),
      updatedAt: fixtureTime(95),
    },
    {
      id: WORLD_IDS.review,
      name: "Whitechapel, 1888",
      briefDoc: review.briefDoc,
      brief: review.brief,
      setupStatus: "review",
      solvability: { ...PASSED, checkedAt: fixtureTime(1500) },
      createdAt: fixtureTime(1440),
      updatedAt: fixtureTime(1500),
    },
    {
      id: WORLD_IDS.drafting,
      name: "The Thames Ledger",
      briefDoc: drafting.briefDoc,
      brief: drafting.brief,
      setupStatus: "drafting",
      solvability: null,
      createdAt: fixtureTime(2880),
      updatedAt: fixtureTime(2890),
    },
    {
      id: WORLD_IDS.draft,
      name: "Fog over the Yard",
      briefDoc: draftBriefDocument(),
      brief: null,
      setupStatus: "draft",
      solvability: null,
      createdAt: fixtureTime(2900),
      updatedAt: fixtureTime(2910),
    },
  ]
}

// Operations

export function listWorlds(): World[] {
  return [...getStore().worlds.values()].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  )
}

export function getWorld(id: string): World {
  const world = getStore().worlds.get(id)
  if (!world)
    throw new StoreError(
      "not_found",
      `There is no World "${id}". It may have been deleted; go back to your Worlds.`
    )
  return world
}

/** A World's template Entries (not Session copies), in stored order. */
export function listWorldEntries(worldId: string): Entry[] {
  return [...getStore().entries.values()].filter(
    (entry) => entry.worldId === worldId && entry.sessionId === null
  )
}

export function sessionSummaries(worldId: string): SessionSummary[] {
  const store = getStore()
  return [...store.sessions.values()]
    .filter((session) => session.worldId === worldId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((session) => ({
      id: session.id,
      ending: session.ending,
      turnCount: store.turns.get(session.id)?.length ?? 0,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    }))
}

/** Replaces a World record (used by operations in other areas, e.g. setup status and solvability). */
export function saveWorld(world: World): World {
  getStore().worlds.set(world.id, world)
  return world
}

/** The Worlds home rows, most recently updated first. */
export function worldSummaries(): WorldSummary[] {
  const store = getStore()
  const sessionCounts = new Map<string, number>()
  for (const session of store.sessions.values()) {
    sessionCounts.set(
      session.worldId,
      (sessionCounts.get(session.worldId) ?? 0) + 1
    )
  }
  return listWorlds().map((world) => ({
    id: world.id,
    name: world.name,
    setupStatus: world.setupStatus,
    sessionCount: sessionCounts.get(world.id) ?? 0,
    createdAt: world.createdAt,
    updatedAt: world.updatedAt,
  }))
}

/**
 * Converts a Brief document, refusing anything conversion cannot read. Returns
 * the validated Brief, or null while the document does not pass §7.1.
 */
function briefOf(briefDoc: unknown[]): Brief | null {
  let conversion: ReturnType<typeof documentToBrief>
  try {
    conversion = documentToBrief(briefDoc as SandsBlock[])
  } catch {
    throw new StoreError(
      "invalid",
      "The Brief document is malformed, so it was not saved. Reload the page and try again."
    )
  }
  return conversion.validation.success ? conversion.validation.brief : null
}

/** Creates a World in `draft`, its Brief the new-Brief template (spec §7.1) unless a document is given. */
export function createWorld(request: {
  name: string
  briefDoc?: unknown[]
}): World {
  const briefDoc = request.briefDoc ?? newBriefTemplate(randomId)
  const now = nowIso()
  const world: World = {
    id: newId("w"),
    name: request.name,
    briefDoc,
    brief: briefOf(briefDoc),
    setupStatus: "draft",
    solvability: null,
    createdAt: now,
    updatedAt: now,
  }
  return saveWorld(world)
}

/**
 * Autosave: stores the Brief document (and its validated Brief, or null) and
 * the name. The Brief is locked once setup has started (spec §6: `brief_json`
 * is locked); the name can change at any time.
 */
export function saveBrief(
  worldId: string,
  request: { name?: string; briefDoc?: unknown[] }
): World {
  const world = getWorld(worldId)
  let next: World = { ...world }
  if (request.briefDoc !== undefined) {
    if (world.setupStatus !== "draft") {
      throw new StoreError(
        "conflict",
        world.setupStatus === "drafting"
          ? "Setup is running, so the Brief is locked. Your last edits were not saved; wait for setup to finish or fail."
          : "Setup has run, so the Brief is locked. Change the World in the setup review instead."
      )
    }
    next = {
      ...next,
      briefDoc: request.briefDoc,
      brief: briefOf(request.briefDoc),
    }
  }
  if (request.name !== undefined) next = { ...next, name: request.name }
  return saveWorld({ ...next, updatedAt: nowIso() })
}
