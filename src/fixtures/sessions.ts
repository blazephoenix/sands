/**
 * Sessions and Turns: fixture data, the Turn builders, and store operations.
 *
 * Sessions of "The Merchant Killings" (ready World):
 * - `s-midplay`: six Turns into play. Turn 3 needed a second Round (both first
 *   Drafts rejected), Turn 5 was flagged after three Rounds, and Turn 6's
 *   background work is still pending. Two Entries were invented in play.
 * - `s-win`, `s-death`, `s-removed`: one finished Session per Ending.
 *
 * Each Session holds its own copies of the World's Entries (ADR-0005).
 * Ticket 04 adds its Turn script (the Turns the Turn route plays next) here,
 * built with `buildTurn` and `buildRound`.
 */
import { copyEntriesForSession } from "@/codex/session-copy"
import type { CreateSessionResponse } from "@/domain/api"
import type { Entry } from "@/domain/entry"
import {
  RULES,
  type BackgroundResults,
  type Classification,
  type Discovery,
  type Draft,
  type Outcome,
  type PlayerState,
  type Round,
  type Rule,
  type RuleResult,
  type Session,
  type Turn,
} from "@/domain/session"
import { ENGINE_CONFIG, ruleVerdict } from "@/engine/config"

import { londonEntries } from "./entries"
import { getStore, newId, nowIso, StoreError } from "./store"
import { copyId, fixtureTime, SESSION_IDS, WORLD_IDS } from "./ids"
import { getWorld, saveWorld } from "./worlds"

export { SESSION_IDS, copyId } from "./ids"

const WORLD = WORLD_IDS.ready
const PREFIX = "mk"

// Builders (also for ticket 04's Turn script).

const RULE_QUESTIONS: Record<Rule, string> = {
  character_drift: "Does anything a named character says or does contradict their personality or backstory?",
  arc: "Does the Draft depict events from later_arcs, or contradict current_arc?",
  location: "Does the Draft introduce a named place a character could travel to that is not in codex?",
  knowledge: "Does a character reveal information that is not in allowed_reveals or knowledge_revealed?",
  unplanned_clue: "Does the Draft present evidence implicating the hidden character that is not a discoverable or found Clue?",
  outcome: "Does the Draft contradict outcome?",
  agency: "Does the Player character say or do more than player_input?",
  period: "Does the Draft contain anachronisms for setting?",
  codex: "Does the Draft contradict an accepted or edited Entry in codex, or mention anything in rejected_names?",
  reputation: "Does NPC behaviour toward the Player contradict reputation_band?",
  voice: "Does the Draft depart from voice?",
  ending: "Does the Draft narrate an Ending other than ending?",
}

/** Rule results for one Draft: low probabilities except the `overrides`. `ending` is only asked on ending Turns. */
export function buildRules(overrides: Partial<Record<Rule, number>> = {}, options: { endingTurn?: boolean; seed?: number } = {}): RuleResult[] {
  const seed = options.seed ?? 1
  return RULES.filter((rule) => rule !== "ending" || options.endingTurn).map((rule, index) => {
    const probability = overrides[rule] ?? Math.round((0.03 + ((seed * 7 + index * 13) % 17) / 100) * 100) / 100
    return { rule, question: RULE_QUESTIONS[rule], probability, ...ruleVerdict(probability) }
  })
}

export function buildDraft(id: string, text: string, rules: RuleResult[], shipped = false): Draft {
  const highestViolation = Math.max(...rules.map((rule) => rule.probability))
  return { id, text, rules, highestViolation, passed: rules.every((rule) => !rule.failed), shipped }
}

export function buildRound(index: number, drafts: Draft[], feedback: string[] = []): Round {
  return { index, feedback, drafts }
}

/** A Round where both Drafts pass and the first ships. */
function cleanRound(turnKey: string, passage: string, alternative: string, seed: number, endingTurn = false): Round[] {
  return [
    buildRound(1, [
      buildDraft(`${turnKey}-r1a`, passage, buildRules({}, { seed, endingTurn }), true),
      buildDraft(`${turnKey}-r1b`, alternative, buildRules({}, { seed: seed + 3, endingTurn })),
    ]),
  ]
}

export type TurnSpec = {
  idx: number
  input: string
  intent: [string, number]
  target: [string, string, number]
  classification: [Classification, number]
  outcome: Omit<Outcome, "ending" | "deathRoll"> & Partial<Pick<Outcome, "ending" | "deathRoll">>
  directive: string
  passage: string
  /** Defaults to one clean Round shipping `passage`. */
  rounds?: Round[]
  alternative?: string
  discovery?: Discovery[]
  background: BackgroundResults | null
  state: PlayerState
  minutes: number
}

export function buildTurn(sessionId: string, spec: TurnSpec): Turn {
  const key = `${sessionId}-t${spec.idx}`
  const endingTurn = (spec.outcome.ending ?? "none") !== "none"
  const rounds =
    spec.rounds ?? cleanRound(key, spec.passage, spec.alternative ?? `${spec.passage.split(". ")[0]}.`, spec.idx + 2, endingTurn)
  const shipped = rounds.flatMap((round) => round.drafts).find((draft) => draft.shipped)!
  const [classification, classificationP] = spec.classification
  return {
    id: key,
    sessionId,
    idx: spec.idx,
    playerInput: spec.input,
    passage: shipped.text,
    flagged: rounds.length === 3 && !shipped.passed,
    log: {
      reading: {
        intent: { value: spec.intent[0], probability: spec.intent[1] },
        target: { value: spec.target[0], label: spec.target[1], probability: spec.target[2] },
        classification: {
          value: classification,
          probability: classificationP,
          belowFloor: classificationP < ENGINE_CONFIG.choiceConfidenceFloor,
        },
      },
      outcome: { ending: "none", deathRoll: null, ...spec.outcome },
      directive: spec.directive,
      rounds,
      discovery: spec.discovery ?? [],
      background: spec.background,
      timings: {
        totalMs: 2600 + rounds.length * 1900,
        readingMs: 410,
        resolvingMs: 3,
        writingMs: 1500 * rounds.length,
        judgingMs: 640 * rounds.length,
        backgroundMs: spec.background ? 2100 : null,
      },
      jevModelVersion: "jev-1.13.0",
    },
    state: spec.state,
    backgroundStatus: spec.background === null ? "pending" : spec.background.error ? "failed" : "done",
    createdAt: fixtureTime(spec.minutes),
  }
}

function background(partial: Partial<BackgroundResults> = {}): BackgroundResults {
  return { newEntryIds: [], arcCheck: [], arcAdvancedTo: null, pacing: null, error: null, ...partial }
}

function state(partial: Partial<PlayerState> & Pick<PlayerState, "locationId">): PlayerState {
  return {
    arcIndex: 0,
    cluesFound: [],
    knowledgeRevealed: {},
    reputation: ENGINE_CONFIG.startingReputation,
    offScriptCount: 0,
    warningsGiven: [],
    pacingNudge: { active: false, reason: null },
    ending: "none",
    ...partial,
  }
}

// Sessions

const SESSIONS: Session[] = [
  { id: SESSION_IDS.midPlay, worldId: WORLD, mode: "harness", seed: 1888, ending: "none", createdAt: fixtureTime(120), updatedAt: fixtureTime(146) },
  { id: SESSION_IDS.win, worldId: WORLD, mode: "harness", seed: 42, ending: "win", createdAt: fixtureTime(200), updatedAt: fixtureTime(214) },
  { id: SESSION_IDS.death, worldId: WORLD, mode: "harness", seed: 7, ending: "death", createdAt: fixtureTime(300), updatedAt: fixtureTime(306) },
  { id: SESSION_IDS.removed, worldId: WORLD, mode: "harness", seed: 99, ending: "removed", createdAt: fixtureTime(400), updatedAt: fixtureTime(412) },
]

export function seedSessions(): Session[] {
  return SESSIONS.map((session) => ({ ...session }))
}

/** Every Session's copies of the World's Entries, plus play-invented Entries and one mid-play edit. */
export function seedSessionEntries(): Entry[] {
  const template = londonEntries(WORLD, PREFIX, "ready")
  const out: Entry[] = []
  for (const session of SESSIONS) {
    const copies = copyEntriesForSession(template, session.id, {
      now: session.createdAt,
      newId: (entry) => copyId(session.id, entry.id),
    })
    out.push(...copies)
  }

  const mid = SESSION_IDS.midPlay
  // The Author edited Nell mid-play: from the next Turn she will only talk near the market.
  const nell = out.find((entry) => entry.id === copyId(mid, "mk-nell"))!
  Object.assign(nell, {
    status: "edited",
    description: "A flower seller outside Spitalfields Market. She talks only where the constables cannot hear.",
    updatedAt: fixtureTime(138),
  })

  const person = { age: "", isPlayer: false, hiddenFields: [], aliases: [] }
  out.push(
    {
      id: `${mid}.play-tobias`,
      worldId: WORLD,
      sessionId: mid,
      templateId: null,
      kind: "npc",
      name: "Tobias Wren",
      description: "A lamplighter on Whitechapel High Street who lit the lamps outside Whitlock's shop.",
      keyFacts: [],
      data: { ...person, role: "Lamplighter", personality: "Talkative, superstitious.", backstory: "Has lit the same street for thirty years." },
      source: "play",
      sourceTurn: 2,
      status: "proposed",
      jevFlags: [],
      seenAt: fixtureTime(131),
      createdAt: fixtureTime(130),
      updatedAt: fixtureTime(130),
    },
    {
      id: `${mid}.play-hattie`,
      worldId: WORLD,
      sessionId: mid,
      templateId: null,
      kind: "npc",
      name: "Hattie Crouch",
      description: "Keeps a lodging house by the docks and rents a room to a quiet young clerk.",
      keyFacts: [],
      data: { ...person, role: "Landlady", personality: "Sharp-tongued, counts every penny.", backstory: "Widowed; takes in lodgers from the shipping offices." },
      source: "play",
      sourceTurn: 4,
      status: "proposed",
      jevFlags: [],
      seenAt: null,
      createdAt: fixtureTime(142),
      updatedAt: fixtureTime(142),
    }
  )
  return out
}

export function seedTurns(): Turn[] {
  return [...midPlayTurns(), ...winTurns(), ...deathTurns(), ...removedTurns()]
}

function midPlayTurns(): Turn[] {
  const s = SESSION_IDS.midPlay
  const c = (key: string) => copyId(s, `${PREFIX}-${key}`)
  const yard = c("yard")
  const whitechapel = c("whitechapel")
  const docks = c("docks")

  return [
    buildTurn(s, {
      idx: 0,
      minutes: 121,
      input: "I take the case file from Captain James and read it at his desk.",
      intent: ["examine", 0.91],
      target: ["none", "none", 0.83],
      classification: ["on_script", 0.93],
      outcome: { kind: "narrated", summary: "Jacob reads the case file; nothing is decided.", reputationDelta: 0, offScriptDelta: 0 },
      directive: "Arc 1, Introduction. Captain James hands over the file with visible reluctance. Normal Band: he is civil, not warm.",
      passage:
        "Captain James slid the file across the desk as if it owed him money. Three names, three dates, three addresses east of the Tower. Jacob read it twice. The Captain watched him the whole time and said nothing useful.",
      background: background({ arcCheck: [{ exitConditionId: c("exit-1"), probability: 0.91, met: true }], arcAdvancedTo: 1 }),
      state: state({ locationId: yard, arcIndex: 1 }),
    }),
    buildTurn(s, {
      idx: 1,
      minutes: 124,
      input: "I ask Amanda what the victims had in common.",
      intent: ["question", 0.95],
      target: [c("amanda"), "Amanda Hopkins", 0.96],
      classification: ["on_script", 0.9],
      outcome: { kind: "questioned", summary: "Amanda may reveal what she knows at normal Band.", reputationDelta: 0, offScriptDelta: 0 },
      directive: "Allowed reveal: Amanda on the victims' trade. She is precise and a little amused.",
      passage:
        "Hopkins did not need the file. \"They all lent money to the same house,\" she said. \"Rober and Sons, wool. It is in the ledgers, if anyone had bothered to read them.\"",
      discovery: [
        {
          target: { kind: "knowledge", entryId: c("k-amanda") },
          question: "Did the Draft reveal that all three victims lent money to Rober & Sons?",
          probability: 0.88,
          revealed: true,
        },
      ],
      background: background({
        arcCheck: [{ exitConditionId: c("exit-2"), probability: 0.32, met: false }],
        pacing: { probability: 0.74, nudge: false, reason: null },
      }),
      state: state({ locationId: yard, arcIndex: 1, knowledgeRevealed: { [c("amanda")]: [c("k-amanda")] } }),
    }),
    buildTurn(s, {
      idx: 2,
      minutes: 129,
      input: "I walk to Whitechapel High Street.",
      intent: ["move", 0.97],
      target: [whitechapel, "Whitechapel High Street", 0.95],
      classification: ["on_script", 0.88],
      outcome: { kind: "moved", summary: "Jacob moves to Whitechapel High Street.", reputationDelta: 0, offScriptDelta: 0 },
      directive: "Scene: Whitechapel High Street, morning. Describe only this street.",
      passage: "",
      rounds: [
        buildRound(1, [
          buildDraft(
            `${s}-t2-r1a`,
            "Jacob walked east past the Ten Bells, where a barman swore he had seen the killer twice.",
            buildRules({ location: 0.81, codex: 0.36 }, { seed: 4 })
          ),
          buildDraft(
            `${s}-t2-r1b`,
            "\"Right then,\" Jacob said to the cabman, and told him to wait while he walked the length of the street.",
            buildRules({ agency: 0.67 }, { seed: 5 })
          ),
        ]),
        buildRound(
          2,
          [
            buildDraft(
              `${s}-t2-r2a`,
              "Whitechapel High Street was all barrows and breath. A lamplighter was still at work outside the draper's shop, where Whitlock had died, and the shutters were painted over in black.",
              buildRules({ location: 0.12 }, { seed: 6 }),
              true
            ),
            buildDraft(
              `${s}-t2-r2b`,
              "The street smelled of wet straw. Nobody looked at the draper's shop, which is how Jacob knew they all remembered it.",
              buildRules({}, { seed: 7 })
            ),
          ],
          [
            "Location (0.81): the Draft introduces the Ten Bells as a place to go. Keep to Whitechapel High Street.",
            "Agency (0.67): the Draft has Jacob speak beyond the Player's input. Rewrite without adding his words.",
          ]
        ),
      ],
      background: background({
        newEntryIds: [`${s}.play-tobias`],
        arcCheck: [{ exitConditionId: c("exit-2"), probability: 0.41, met: false }],
        pacing: { probability: 0.69, nudge: false, reason: null },
      }),
      state: state({ locationId: whitechapel, arcIndex: 1, knowledgeRevealed: { [c("amanda")]: [c("k-amanda")] } }),
    }),
    buildTurn(s, {
      idx: 3,
      minutes: 133,
      input: "I examine the ground outside Whitlock's shop.",
      intent: ["examine", 0.94],
      target: ["none", "none", 0.8],
      classification: ["on_script", 0.9],
      outcome: { kind: "examined", summary: "C5, the docker's cap, is discoverable here.", reputationDelta: 0, offScriptDelta: 0 },
      directive: "Discoverable: C5 (a labelled red herring). Let the constables be pleased with it.",
      passage:
        "In the gutter by the shop step lay a docker's cap, sodden and trodden flat. The constable at the door looked delighted. Jacob turned it over with his cane and did not share his delight.",
      discovery: [
        {
          target: { kind: "clue", entryId: c("c5") },
          question: "Did the Draft reveal the Irish docker's cap?",
          probability: 0.93,
          revealed: true,
        },
      ],
      background: background({
        arcCheck: [{ exitConditionId: c("exit-2"), probability: 0.83, met: true }],
        arcAdvancedTo: 2,
        pacing: { probability: 0.8, nudge: false, reason: null },
      }),
      state: state({
        locationId: whitechapel,
        arcIndex: 2,
        cluesFound: [c("c5")],
        knowledgeRevealed: { [c("amanda")]: [c("k-amanda")] },
      }),
    }),
    buildTurn(s, {
      idx: 4,
      minutes: 139,
      input: "I take a constable's lantern and search the docks alone after dark.",
      intent: ["move", 0.86],
      target: [docks, "St Katharine Docks", 0.9],
      classification: ["reckless", 0.77],
      outcome: {
        kind: "reckless_survived",
        summary: "Death roll 0.63 against odds of 0.50: Jacob survives the night.",
        reputationDelta: 0,
        offScriptDelta: 0,
        deathRoll: { odds: 0.5, roll: 0.63, lethal: false },
      },
      directive: "Scene: St Katharine Docks at night. Danger is close but nothing happens to Jacob. C2 is discoverable.",
      passage: "",
      rounds: [
        buildRound(1, [
          buildDraft(`${s}-t4-r1a`, "Jacob drew his revolver and fired at the shape by the warehouse.", buildRules({ agency: 0.74 }, { seed: 8 })),
          buildDraft(`${s}-t4-r1b`, "Somewhere in the dark, Max Rober was watching him, and Jacob knew it.", buildRules({ knowledge: 0.69, unplanned_clue: 0.55 }, { seed: 9 })),
        ]),
        buildRound(
          2,
          [
            buildDraft(`${s}-t4-r2a`, "Jacob called out to the watchman and asked him to walk the quay with him.", buildRules({ agency: 0.58 }, { seed: 10 })),
            buildDraft(`${s}-t4-r2b`, "The electric lamps along the quay buzzed and flickered as Jacob passed.", buildRules({ period: 0.62 }, { seed: 11 })),
          ],
          [
            "Agency (0.74): the Draft has Jacob fire a revolver the Player never drew. Rewrite without adding his actions.",
            "Knowledge (0.69): the narration names the Hidden character. Keep the Hidden truth hidden.",
          ]
        ),
        buildRound(
          3,
          [
            buildDraft(
              `${s}-t4-r3a`,
              "The lantern made a small, lonely room of light. Jacob moved along the quay, and twice he stopped, sure he had heard a step behind him that was not his own. Nothing came of it. By the chandlery a scrap of paper fluttered on a nail.",
              buildRules({ agency: 0.52 }, { seed: 12 }),
              true
            ),
            buildDraft(`${s}-t4-r3b`, "A young man in a clerk's coat slipped between the warehouses as Jacob raised the lantern.", buildRules({ knowledge: 0.61 }, { seed: 13 })),
          ],
          [
            "Agency (0.58): the Draft has Jacob speak to the watchman. Rewrite without adding his words.",
            "Period (0.62): electric lamps are an anachronism for 1888 London. Use gas or oil.",
          ]
        ),
      ],
      discovery: [
        {
          target: { kind: "clue", entryId: c("c2") },
          question: "Did the Draft reveal the torn ledger page?",
          probability: 0.44,
          revealed: false,
        },
      ],
      background: background({
        newEntryIds: [`${s}.play-hattie`],
        arcCheck: [{ exitConditionId: c("exit-3"), probability: 0.04, met: false }],
        pacing: { probability: 0.52, nudge: false, reason: null },
      }),
      state: state({
        locationId: docks,
        arcIndex: 2,
        cluesFound: [c("c5")],
        knowledgeRevealed: { [c("amanda")]: [c("k-amanda")] },
      }),
    }),
    buildTurn(s, {
      idx: 5,
      minutes: 146,
      input: "I ask Dr. Pryce what the three wounds have in common.",
      intent: ["question", 0.93],
      target: [c("pryce"), "Dr. Henry Pryce", 0.94],
      classification: ["on_script", 0.91],
      outcome: { kind: "questioned", summary: "Pryce may reveal what he knows at low Band or above.", reputationDelta: 5, offScriptDelta: 0 },
      directive: "Allowed reveal: Pryce on the wounds (C1). He enjoys Jacob's bluntness.",
      passage:
        "Pryce laid the three drawings side by side. \"Same blade,\" he said. \"Short, hooked, and kept very sharp. Your man is right-handed, and he is not in a hurry.\"",
      discovery: [
        {
          target: { kind: "knowledge", entryId: c("k-pryce") },
          question: "Did the Draft reveal that the same blade killed all three men?",
          probability: 0.92,
          revealed: true,
        },
        {
          target: { kind: "clue", entryId: c("c1") },
          question: "Did the Draft reveal the matching knife wounds?",
          probability: 0.9,
          revealed: true,
        },
      ],
      background: null,
      state: state({
        locationId: yard,
        arcIndex: 2,
        cluesFound: [c("c5"), c("c1")],
        knowledgeRevealed: { [c("amanda")]: [c("k-amanda")], [c("pryce")]: [c("k-pryce")] },
        reputation: 65,
      }),
    }),
  ]
}

function winTurns(): Turn[] {
  const s = SESSION_IDS.win
  const c = (key: string) => copyId(s, `${PREFIX}-${key}`)
  const done = (arcIndex: number) => background({ pacing: { probability: 0.82, nudge: false, reason: null }, arcAdvancedTo: arcIndex > 0 ? arcIndex : null })
  return [
    buildTurn(s, {
      idx: 0,
      minutes: 202,
      input: "I ask Dr. Pryce about the wounds.",
      intent: ["question", 0.94],
      target: [c("pryce"), "Dr. Henry Pryce", 0.95],
      classification: ["on_script", 0.92],
      outcome: { kind: "questioned", summary: "Pryce may reveal the wounds.", reputationDelta: 5, offScriptDelta: 0 },
      directive: "Allowed reveal: C1.",
      passage: "\"One blade,\" Pryce said. \"Hooked. The same hand every time.\"",
      discovery: [{ target: { kind: "clue", entryId: c("c1") }, question: "Did the Draft reveal the matching wounds?", probability: 0.91, revealed: true }],
      background: done(0),
      state: state({ locationId: c("yard"), arcIndex: 1, cluesFound: [c("c1")], reputation: 65 }),
    }),
    buildTurn(s, {
      idx: 1,
      minutes: 206,
      input: "I search the quay by Pembury's chandlery.",
      intent: ["examine", 0.9],
      target: ["none", "none", 0.8],
      classification: ["on_script", 0.9],
      outcome: { kind: "examined", summary: "C2 is discoverable at the docks.", reputationDelta: 5, offScriptDelta: 0 },
      directive: "Discoverable: C2.",
      passage: "On a nail by the chandlery door hung a torn page of accounts. Three names on it had been underlined, hard.",
      discovery: [{ target: { kind: "clue", entryId: c("c2") }, question: "Did the Draft reveal the ledger page?", probability: 0.89, revealed: true }],
      background: done(2),
      state: state({ locationId: c("docks"), arcIndex: 2, cluesFound: [c("c1"), c("c2")], reputation: 70 }),
    }),
    buildTurn(s, {
      idx: 2,
      minutes: 210,
      input: "I find Nell Garvey and ask what she saw the morning Carrow died.",
      intent: ["question", 0.92],
      target: [c("nell"), "Nell Garvey", 0.93],
      classification: ["on_script", 0.91],
      outcome: { kind: "questioned", summary: "Nell may reveal what she saw at normal Band.", reputationDelta: 5, offScriptDelta: 0 },
      directive: "Allowed reveal: C3. High Band: Nell is warm with Jacob.",
      passage: "\"A clerk,\" Nell said, turning a violet in her fingers. \"Young. Good coat. Came out of Carrow's before it was light.\"",
      discovery: [{ target: { kind: "clue", entryId: c("c3") }, question: "Did the Draft reveal the young clerk?", probability: 0.9, revealed: true }],
      background: done(0),
      state: state({ locationId: c("spitalfields"), arcIndex: 2, cluesFound: [c("c1"), c("c2"), c("c3")], reputation: 75 }),
    }),
    buildTurn(s, {
      idx: 3,
      minutes: 214,
      input: "I arrest Max Rober at the shipping office.",
      intent: ["arrest", 0.95],
      target: [c("max"), "Max Rober", 0.94],
      classification: ["on_script", 0.95],
      outcome: {
        kind: "decisive_success",
        summary: "Three of the four required Clues are found: the arrest succeeds and the story is won.",
        reputationDelta: 0,
        offScriptDelta: 0,
        ending: "win",
      },
      directive: "Ending: win. Narrate the arrest. Max goes quietly.",
      passage:
        "Max Rober put down his pen when he saw them, and squared the papers on his desk before he stood. He did not ask why. On the walk to the Yard he said only one thing: that his father would read about it in the morning.",
      background: done(0),
      state: state({ locationId: c("docks"), arcIndex: 2, cluesFound: [c("c1"), c("c2"), c("c3")], reputation: 75, ending: "win" }),
    }),
  ]
}

function deathTurns(): Turn[] {
  const s = SESSION_IDS.death
  const c = (key: string) => copyId(s, `${PREFIX}-${key}`)
  return [
    buildTurn(s, {
      idx: 0,
      minutes: 302,
      input: "I go to Spitalfields Market.",
      intent: ["move", 0.96],
      target: [c("spitalfields"), "Spitalfields Market", 0.95],
      classification: ["on_script", 0.9],
      outcome: { kind: "moved", summary: "Jacob moves to Spitalfields Market.", reputationDelta: 0, offScriptDelta: 0 },
      directive: "Scene: Spitalfields Market before dawn.",
      passage: "The market was waking in the dark: carts, lanterns, a boy asleep on a sack of onions.",
      background: background({ arcAdvancedTo: 1 }),
      state: state({ locationId: c("spitalfields"), arcIndex: 1 }),
    }),
    buildTurn(s, {
      idx: 1,
      minutes: 306,
      input: "I follow the young clerk into Carrow's warehouse alone, unarmed, in the dark.",
      intent: ["move", 0.8],
      target: [c("spitalfields"), "Spitalfields Market", 0.72],
      classification: ["reckless", 0.88],
      outcome: {
        kind: "reckless_death",
        summary: "Death roll 0.12 against odds of 0.35: the action is lethal. The story ends in death.",
        reputationDelta: 0,
        offScriptDelta: 0,
        deathRoll: { odds: 0.35, roll: 0.12, lethal: true },
        ending: "death",
      },
      directive: "Ending: death. Narrate it without gore.",
      passage:
        "The warehouse door was open, which should have told him something. Inside it smelled of tea and cold iron. Jacob heard the step behind him a moment too late, and then he heard nothing at all.",
      background: background(),
      state: state({ locationId: c("spitalfields"), arcIndex: 1, ending: "death" }),
    }),
  ]
}

function removedTurns(): Turn[] {
  const s = SESSION_IDS.removed
  const c = (key: string) => copyId(s, `${PREFIX}-${key}`)
  const yard = c("yard")
  const offScript = (idx: number, minutes: number, input: string, passage: string, directive: string, count: number, rep: number, warnings: number[], ending: "none" | "removed" = "none") =>
    buildTurn(s, {
      idx,
      minutes,
      input,
      intent: ["other", 0.83],
      target: [c("geoffrey"), "Geoffrey James", 0.7],
      classification: ["off_script", 0.86],
      outcome: {
        kind: "off_script",
        summary:
          ending === "removed"
            ? "Off-script count reaches 4: Jacob is removed from the case."
            : `Off-script: Reputation ${ENGINE_CONFIG.offScriptPenalty}, off-script count ${count}.`,
        reputationDelta: ENGINE_CONFIG.offScriptPenalty,
        offScriptDelta: 1,
        ending,
      },
      directive,
      passage,
      background: background(),
      state: state({ locationId: yard, reputation: rep, offScriptCount: count, warningsGiven: warnings, ending }),
    })
  return [
    offScript(0, 402, "I insult Captain James in front of his men.", "The room went quiet. Captain James looked at Jacob the way a man looks at a stain.", "Off-script. Low patience from the Captain.", 1, 50, []),
    offScript(1, 405, "I tear up the case file.", "\"That,\" said the Captain, very softly, \"was the only copy. You have had your warning, Mr. Flannery.\"", "Off-script count 2: the Captain warns Jacob in the story.", 2, 40, [2]),
    offScript(2, 408, "I tell the newspapers the Yard is useless.", "The morning papers carried his words by nine. By ten the Captain had them pinned to his door. \"Once more,\" he said, \"and you are on the boat home.\"", "Off-script count 3: final warning in the story.", 3, 30, [2, 3]),
    offScript(3, 412, "I walk out of the Yard and spend the day in a public house.", "When Jacob came back, his desk had been cleared. The Captain did not look up. \"The Home Office thanks you for your time,\" he said. \"Your ship sails on Thursday.\"", "Ending: removed. The Captain takes Jacob off the case.", 4, 20, [2, 3], "removed"),
  ]
}

/**
 * The Turns the Turn route plays next, in order, as `buildTurn` specs (their
 * `idx` and `minutes` are replaced when played). Ticket 04 fills this in.
 */
export const TURN_SCRIPT: Omit<TurnSpec, "idx" | "minutes">[] = []

// Operations

export function getSession(id: string): Session {
  const session = getStore().sessions.get(id)
  if (!session) throw new StoreError("not_found", `There is no Session "${id}". Start a new one from its World.`)
  return session
}

export function listTurns(sessionId: string): Turn[] {
  return getStore().turns.get(sessionId) ?? []
}

/**
 * Starts a Session: copies every non-rejected World Entry into it (ADR-0005)
 * and moves a World in review to ready. The World must have passed setup's
 * solvability check.
 */
export function createSession(request: { worldId: string; mode: "harness" | "baseline" }): CreateSessionResponse {
  const world = getWorld(request.worldId)
  if (world.setupStatus === "draft" || world.setupStatus === "drafting") {
    throw new StoreError("conflict", "This World has not finished setup. Run setup and review its Entries before starting a Session.")
  }
  if (!world.solvability?.passed) {
    const gap = world.solvability?.gaps[0]?.message
    throw new StoreError(
      "conflict",
      `This World is not solvable yet${gap ? `: ${gap}` : ""}. Fix the gaps in the setup review, then start again.`
    )
  }
  const store = getStore()
  const now = nowIso()
  const session: Session = {
    id: newId("s"),
    worldId: world.id,
    mode: request.mode,
    seed: Math.floor(Math.random() * 2 ** 31),
    ending: "none",
    createdAt: now,
    updatedAt: now,
  }
  const worldEntries = [...store.entries.values()].filter((entry) => entry.worldId === world.id && entry.sessionId === null)
  const entries = copyEntriesForSession(worldEntries, session.id, { now, newId: (entry) => copyId(session.id, entry.id) })

  store.sessions.set(session.id, session)
  store.turns.set(session.id, [])
  for (const entry of entries) store.entries.set(entry.id, entry)
  if (world.setupStatus === "review") saveWorld({ ...world, setupStatus: "ready", updatedAt: now })
  return { session, entries }
}

