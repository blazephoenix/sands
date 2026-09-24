/**
 * Two Turns of the 1888 World (docs/requirements.md §2), written as the
 * Judge state of spec §10.2. Every smoke-test Draft is judged against one of
 * them. The Entries follow the fixture World in `src/fixtures/entries.ts`.
 */
import type { JudgeJson } from "@/models/judge"

export interface Character {
  name: string
  aliases: string[]
}

export interface TurnContext {
  /** Judge state without `drafts`; the smoke test adds them. */
  state: { [key: string]: JudgeJson }
  /** Characters in the Codex slice, for Character drift name matching. */
  characters: Character[]
  /** Only ending Turns ask the Ending Rule. */
  endingTurn: boolean
  /** Only a Brief with Voice guidance asks the Voice Rule. */
  hasVoice: boolean
}

const setting = "London, autumn 1888: the East End and the City."

const voice =
  "Third person, past tense, close on Jacob. Plain, spare sentences. Fog, " +
  "gaslight and wet stone; no purple prose. Londoners speak period British " +
  "English; Jacob sounds American."

const hiddenTruth =
  "Max Rober, a 21-year-old shipping clerk, is the killer. He murders " +
  "merchants as revenge against his father, Josiah Rober, a wool merchant " +
  "who threw him and his mother out."

const rejectedNames = ["Inspector Frederick Abberline", "Tower Bridge"]

const jacob = {
  name: "Jacob Flannery",
  aliases: ["Jacob", "The American", "Flannery"],
  role: "Detective called over from New York; the Player character",
  age: 38,
  personality: "Weary and sharp-eyed. Drinks more than he admits.",
  backstory: "Sent for after three merchants died in as many weeks.",
}

const nell = {
  name: "Nell Garvey",
  aliases: ["Nell"],
  role: "Flower seller outside Spitalfields Market; a witness",
  age: 24,
  personality: "Quick to laugh, slow to trust the police.",
  backstory: "Sells violets outside the market every morning.",
}

const max = {
  name: "Max Rober",
  aliases: ["the clerk"],
  role: "Clerk at a shipping office on the quay at St Katharine Docks",
  age: 21,
  personality: "Quiet, polite and meticulous. A cold fury under the courtesy.",
  backstory:
    "Son of Josiah Rober, who threw him and his mother out six years ago.",
}

const finch = {
  name: "Walter Finch",
  aliases: ["Finch"],
  role: "Shipping clerk who shares a desk with Max",
  age: 23,
  personality: "Nervous and loyal.",
  backstory: "Suspects nothing.",
}

const pick = (c: { name: string; aliases: string[] }): Character => ({
  name: c.name,
  aliases: c.aliases,
})

/** Midpoint Arc. The Player questions Nell at Spitalfields Market. */
export const questionTurn: TurnContext = {
  endingTurn: false,
  hasVoice: true,
  characters: [pick(jacob), pick(nell)],
  state: {
    setting,
    voice,
    player_input:
      "I buy a bunch of violets from Nell and ask her, kindly, whether she " +
      "saw anyone near Carrow's warehouse the morning he died.",
    outcome: {
      intent: "question",
      target: "Nell Garvey",
      classification: "on_script",
      result:
        "Nell answers the question. She may give up what she saw at dawn " +
        "(see allowed_reveals).",
    },
    current_location: "Spitalfields Market",
    current_arc: {
      name: "Midpoint",
      description:
        "The investigation begins. Jacob discovers evidence and backstories.",
      exit_conditions: [
        "Jacob has learned the victims' shared trade and visited at least one crime scene.",
      ],
    },
    later_arcs: [{ name: "End", description: "The killer is caught." }],
    codex: {
      locations: [
        {
          name: "Spitalfields Market",
          description:
            "The covered market, busy before dawn. Carrow's warehouse stands on its edge.",
          connections: ["Whitechapel High Street"],
        },
        {
          name: "Whitechapel High Street",
          description:
            "Market stalls, costermongers and the draper's shop where Whitlock died.",
          connections: [
            "Scotland Yard",
            "Spitalfields Market",
            "St Katharine Docks",
          ],
        },
      ],
      characters: [jacob, nell],
    },
    rejected_names: rejectedNames,
    allowed_reveals: [
      {
        character: "Nell Garvey",
        fact: "She saw a young man in a clerk's coat leave Carrow's warehouse just before dawn the morning Carrow died.",
      },
    ],
    discoverable_clues: [],
    knowledge_revealed: [
      {
        character: "Dr. Henry Pryce",
        fact: "The same blade killed all three men.",
      },
      {
        character: "Amanda Hopkins",
        fact: "All three victims lent money to Rober & Sons.",
      },
    ],
    clues_found: [
      {
        name: "Matching knife wounds",
        reveals:
          "All three were killed with the same short, hooked blade, by a right-handed man of middling height.",
      },
    ],
    reputation_band: {
      band: "normal",
      guidance:
        "Characters are civil but guarded with Jacob. They answer fair, direct " +
        "questions and give up what they know at this Band, but volunteer " +
        "nothing more and show him neither contempt nor special deference.",
    },
    hidden_truth: hiddenTruth,
  },
}

/** End Arc. The Player arrests Max Rober with the Clues in hand; the story is won. */
export const arrestTurn: TurnContext = {
  endingTurn: true,
  hasVoice: true,
  characters: [pick(jacob), pick(max), pick(finch)],
  state: {
    setting,
    voice,
    player_input:
      "I arrest Max Rober for the murders of Whitlock, Carrow and Pembury.",
    outcome: {
      intent: "arrest",
      target: "Max Rober",
      classification: "on_script",
      result:
        "Success. Every Clue the arrest requires has been found; Max Rober " +
        "is arrested and the story is won.",
    },
    current_location: "St Katharine Docks",
    current_arc: {
      name: "End",
      description: "The killer is caught.",
      exit_conditions: ["Max Rober has been arrested."],
    },
    later_arcs: [],
    codex: {
      locations: [
        {
          name: "St Katharine Docks",
          description:
            "Warehouses of wool, tea and ivory beside the Tower. Pembury's chandlery faces the quay; the shipping office where Max works is on the quay.",
          connections: ["Whitechapel High Street"],
        },
      ],
      characters: [jacob, max, finch],
    },
    rejected_names: rejectedNames,
    allowed_reveals: [],
    discoverable_clues: [],
    knowledge_revealed: [
      {
        character: "Nell Garvey",
        fact: "She saw a young clerk leave Carrow's warehouse at dawn.",
      },
      {
        character: "Amanda Hopkins",
        fact: "All three victims lent money to Rober & Sons.",
      },
    ],
    clues_found: [
      {
        name: "Matching knife wounds",
        reveals: "The same short, hooked blade killed all three men.",
      },
      {
        name: "A torn ledger page",
        reveals: "Rober & Sons listed all three victims as creditors.",
      },
      {
        name: "The young clerk at dawn",
        reveals:
          "A young man in a clerk's coat left Carrow's warehouse before dawn.",
      },
      {
        name: "A cufflink engraved J.R.",
        reveals: "Josiah Rober's cufflink, pawned by his son last winter.",
      },
    ],
    reputation_band: {
      band: "normal",
      guidance:
        "Characters are civil but guarded with Jacob. They show him neither " +
        "contempt nor special deference.",
    },
    hidden_truth: hiddenTruth,
    ending: {
      kind: "win",
      description:
        "The killer is caught: Max Rober is arrested and taken into custody.",
    },
  },
}
