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
 * Ticket 02 adds its fixture data (and create / save operations) here.
 */
import { documentToBrief } from "@/brief/from-document"
import { headingBlock, paragraphBlock, sequentialIds, typedBlock } from "@/brief/to-document"
import type { SessionSummary } from "@/domain/api"
import type { Brief } from "@/domain/brief"
import type { Entry } from "@/domain/entry"
import type { SolvabilityResult, World } from "@/domain/world"
import type { SandsBlock } from "@/editor/schema-config"

import { fixtureTime, WORLD_IDS } from "./ids"
import { getStore, StoreError } from "./store"

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
    typedBlock("setting", { place: "London", period: "Autumn 1888" }, { ids, blockId: id("setting") }),
    typedBlock(
      "character",
      {
        name: "Jacob Flannery",
        role: "Detective, called over from New York for a special case",
        age: "38",
        personality: "Weary and sharp-eyed. Drinks more than he admits, and knows it.\nPatient with witnesses, impatient with rank.",
        backstory:
          "Three merchants have been killed in London in as many weeks. Scotland Yard has sent for an outsider with a reputation for difficult cases.\nHe left a daughter in Brooklyn and writes to her every Sunday.",
        aliases: ["The American", "Flannery"],
      },
      { ids, blockId: id("jacob"), isPlayer: true }
    ),
    typedBlock(
      "character",
      {
        name: "Geoffrey James",
        role: "Police captain, Scotland Yard",
        age: "54",
        personality: "Gruff, proud of the Yard, protective of his men. Wants the case closed by Friday.",
        backstory: "Twenty-six years on the force. Resents that the Home Office sent for an American.",
        aliases: ["Captain James", "the Captain"],
      },
      { ids, blockId: id("geoffrey") }
    ),
    typedBlock(
      "character",
      {
        name: "Amanda Hopkins",
        role: "Second in command",
        age: "41",
        personality: "Precise, dry-humoured, trusts evidence over rank.",
        backstory: "Kept the case files of all three killings. She suspects the victims were connected by trade.",
        aliases: ["Hopkins"],
      },
      { ids, blockId: id("amanda") }
    ),
    typedBlock(
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
    typedBlock(
      "character",
      {
        name: "Edmund Carrow",
        role: "Tea merchant, second victim",
        age: "47",
        personality: "Pious in public, ruthless in business.",
        backstory: "Found at dawn outside his warehouse near Spitalfields Market.",
      },
      { ids, blockId: id("carrow") }
    ),
    typedBlock(
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
    typedBlock(
      "character",
      {
        name: "Max Rober",
        role: "Clerk at a shipping office",
        age: "21",
        personality: "Quiet, polite and meticulous. A cold fury under the courtesy.",
        backstory:
          "Son of Josiah Rober, a wool merchant who threw him and his mother out when he was fifteen. His mother died that winter.\nHe kills merchants as revenge against his father, and against every merchant who reminds him of him.",
        aliases: ["the clerk"],
      },
      {
        ids,
        blockId: id("max"),
        hiddenFields: ["backstory"],
        keyFacts: [{ label: "Motive", text: "Revenge against his father, a merchant.", hidden: true }],
      }
    ),
    typedBlock("location", { name: "Scotland Yard", description: "Great Scotland Yard, Whitehall. Gaslit corridors, damp coats, a captain who wants results." }, { ids, blockId: id("yard") }),
    typedBlock(
      "arc",
      {
        name: "Introduction",
        description: "Jacob lands in London, meets the police and learns the state of the case.",
        exitConditions: ["Jacob has read the case file and met Captain James."],
      },
      { ids, blockId: id("arc-1") }
    ),
    typedBlock(
      "arc",
      { name: "Midpoint", description: "The investigation begins. The Player discovers evidence and backstories." },
      { ids, blockId: id("arc-2") }
    ),
    typedBlock("arc", { name: "End", description: "The killer is caught." }, { ids, blockId: id("arc-3") }),
    typedBlock("ending", { condition: "The killer is caught and arrested." }, { ids, blockId: id("ending") }),
    typedBlock(
      "voice",
      {
        guidelines: "Close third person on Jacob. Short sentences. Fog, not gore: the killings are never shown on the page.",
        samplePassages: "The river smelled of coal and something older. Jacob turned up his collar and did not look at the body until he had to.",
      },
      { ids, blockId: id("voice") }
    ),
    headingBlock(id("notes"), "Notes for the Writer"),
    paragraphBlock(ids(), "The Yard is under pressure from the newspapers. Every constable has an opinion about the Irish dockers; none of them is right."),
  ]
}

/** A Brief document and the validated Brief it converts to. Throws if the fixture breaks §7.1. */
export function londonBrief(prefix: string): { briefDoc: SandsBlock[]; brief: Brief } {
  const briefDoc = londonBriefDocument(prefix)
  const { validation, issues } = documentToBrief(briefDoc)
  if (!validation.success) throw new Error(`London Brief fixture is invalid: ${issues.map((i) => i.message).join(" ")}`)
  return { briefDoc, brief: validation.brief }
}

/** A Brief in progress: the Setting and the player Character are filled in, the Arcs and Ending are not yet. */
function draftBriefDocument(): SandsBlock[] {
  const ids = sequentialIds("fog-b")
  return [
    typedBlock("setting", { place: "London", period: "Winter 1888" }, { ids, blockId: "fog-setting" }),
    typedBlock(
      "character",
      { name: "Jacob Flannery", role: "Detective", personality: "Weary and sharp-eyed." },
      { ids, blockId: "fog-jacob", isPlayer: true }
    ),
    typedBlock("character", { role: "The killer" }, { ids, blockId: "fog-unnamed" }),
    paragraphBlock(ids(), ""),
  ]
}

const PASSED: SolvabilityResult = { passed: true, gaps: [], checkedAt: fixtureTime(60) }

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
  return [...getStore().worlds.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function getWorld(id: string): World {
  const world = getStore().worlds.get(id)
  if (!world) throw new StoreError("not_found", `There is no World "${id}". It may have been deleted; go back to your Worlds.`)
  return world
}

/** A World's template Entries (not Session copies), in stored order. */
export function listWorldEntries(worldId: string): Entry[] {
  return [...getStore().entries.values()].filter((entry) => entry.worldId === worldId && entry.sessionId === null)
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
