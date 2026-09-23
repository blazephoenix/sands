/**
 * Sessions and Turns: fixture data, the Turn builders, and store operations.
 *
 * Sessions of "The Merchant Killings" (ready World), each starting with its
 * Opening (Turn 0, chosen by the Session's seed):
 * - `s-midplay`: six Turns into play. Turn 3 needed a second Round (both first
 *   Drafts rejected), Turn 5 was flagged after three Rounds, and Turn 6's
 *   background work is still pending. Two Entries were invented in play.
 * - `s-win`, `s-death`, `s-removed`: one finished Session per Ending.
 *
 * Each Session holds its own copies of the World's Entries (ADR-0005).
 *
 * Playing (ticket 04): `TURN_SCRIPT` holds the Turns the Turn route plays,
 * `planTurn` builds the next Turn from the Session's state without saving it,
 * `commitTurn` saves it, and `settleBackground` finishes the latest Turn's
 * background work when it is due.
 *
 * The Opening (ticket 05; spec §9.0): `OPENINGS` holds the first scenes,
 * `pickOpening` chooses one by seed, `planOpening` builds Turn 0, and
 * `claimOpening` keeps two requests from writing one Session's Opening at once.
 */
import { copyEntriesForSession } from "@/codex/session-copy"
import type { CreateSessionResponse } from "@/domain/api"
import { isLiveEntry, type Entry } from "@/domain/entry"
import {
  OPENING_IDX,
  RULES,
  isOpening,
  turnSchema,
  type BackgroundResults,
  type Classification,
  type Discovery,
  type Draft,
  type Ending,
  type Outcome,
  type PlayerState,
  type Round,
  type Rule,
  type RuleResult,
  type Session,
  type Turn,
  type TurnLog,
} from "@/domain/session"
import { ENGINE_CONFIG, ruleVerdict } from "@/engine/config"

import { listSessionEntries, londonEntries, saveEntry } from "./entries"
import { getStore, newId, nowIso, StoreError } from "./store"
import { copyId, fixtureTime, SESSION_IDS, WORLD_IDS } from "./ids"
import { getWorld, saveWorld } from "./worlds"

export { SESSION_IDS, copyId } from "./ids"

const WORLD = WORLD_IDS.ready
const PREFIX = "mk"

// Builders (also for ticket 04's Turn script).

const RULE_QUESTIONS: Record<Rule, string> = {
  character_drift:
    "Does anything a named character says or does contradict their personality or backstory?",
  arc: "Does the Draft depict events from later_arcs, or contradict current_arc?",
  location:
    "Does the Draft introduce a named place a character could travel to that is not in codex?",
  knowledge:
    "Does a character reveal information that is not in allowed_reveals or knowledge_revealed?",
  unplanned_clue:
    "Does the Draft present evidence implicating the hidden character that is not a discoverable or found Clue?",
  outcome: "Does the Draft contradict outcome?",
  agency: "Does the Player character say or do more than player_input?",
  period: "Does the Draft contain anachronisms for setting?",
  codex:
    "Does the Draft contradict an accepted or edited Entry in codex, or mention anything in rejected_names?",
  reputation:
    "Does NPC behaviour toward the Player contradict reputation_band?",
  voice: "Does the Draft depart from voice?",
  ending: "Does the Draft narrate an Ending other than ending?",
}

/** The Opening has no Player input: Agency asks whether the Player character does anything beyond arriving (spec §9.0). */
const OPENING_AGENCY_QUESTION =
  "Does the Player character say or do anything beyond arriving at the start location?"

export type RuleOptions = {
  endingTurn?: boolean
  opening?: boolean
  seed?: number
}

/**
 * Rule results for one Draft: low probabilities except the `overrides`.
 * `ending` is only asked on ending Turns; the Opening has no Outcome to
 * contradict, so it is not asked `outcome`.
 */
export function buildRules(
  overrides: Partial<Record<Rule, number>> = {},
  options: RuleOptions = {}
): RuleResult[] {
  const seed = options.seed ?? 1
  const asked = RULES.filter(
    (rule) =>
      (rule !== "ending" || options.endingTurn) &&
      (rule !== "outcome" || !options.opening)
  )
  return asked.map((rule, index) => {
    const probability =
      overrides[rule] ??
      Math.round((0.03 + ((seed * 7 + index * 13) % 17) / 100) * 100) / 100
    const question =
      options.opening && rule === "agency"
        ? OPENING_AGENCY_QUESTION
        : RULE_QUESTIONS[rule]
    return { rule, question, probability, ...ruleVerdict(probability) }
  })
}

export function buildDraft(
  id: string,
  text: string,
  rules: RuleResult[],
  shipped = false
): Draft {
  const highestViolation = Math.max(...rules.map((rule) => rule.probability))
  return {
    id,
    text,
    rules,
    highestViolation,
    passed: rules.every((rule) => !rule.failed),
    shipped,
  }
}

export function buildRound(
  index: number,
  drafts: Draft[],
  feedback: string[] = []
): Round {
  return { index, feedback, drafts }
}

/** A Round where both Drafts pass and the first ships. */
function cleanRound(
  turnKey: string,
  passage: string,
  alternative: string,
  seed: number,
  options: Omit<RuleOptions, "seed"> = {}
): Round[] {
  return [
    buildRound(1, [
      buildDraft(
        `${turnKey}-r1a`,
        passage,
        buildRules({}, { ...options, seed }),
        true
      ),
      buildDraft(
        `${turnKey}-r1b`,
        alternative,
        buildRules({}, { ...options, seed: seed + 3 })
      ),
    ]),
  ]
}

/** What every Turn has, the Opening included. */
type TurnBase = {
  idx: number
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

export type TurnSpec = TurnBase & {
  input: string
  intent: [string, number]
  target: [string, string, number]
  classification: [Classification, number]
  outcome: Omit<Outcome, "ending" | "deathRoll"> &
    Partial<Pick<Outcome, "ending" | "deathRoll">>
}

/** The Opening: Turn 0, no Player input, nothing read and no Outcome (spec §9.0). */
export type OpeningSpec = Omit<TurnBase, "idx">

function assembleTurn(
  sessionId: string,
  spec: TurnBase,
  played: {
    input: string
    reading: TurnLog["reading"]
    outcome: Outcome
  } | null
): Turn {
  const key = `${sessionId}-t${spec.idx}`
  const endingTurn = (played?.outcome.ending ?? "none") !== "none"
  const rounds =
    spec.rounds ??
    cleanRound(
      key,
      spec.passage,
      spec.alternative ?? `${spec.passage.split(". ")[0]}.`,
      spec.idx + 2,
      { endingTurn, opening: played === null }
    )
  const shipped = rounds
    .flatMap((round) => round.drafts)
    .find((draft) => draft.shipped)!
  const readingMs = played ? 410 : 0
  const resolvingMs = played ? 3 : 0
  return {
    id: key,
    sessionId,
    idx: spec.idx,
    playerInput: played?.input ?? null,
    passage: shipped.text,
    flagged: rounds.length === 3 && !shipped.passed,
    log: {
      reading: played?.reading ?? null,
      outcome: played?.outcome ?? null,
      directive: spec.directive,
      rounds,
      discovery: spec.discovery ?? [],
      background: spec.background,
      timings: {
        totalMs: (played ? 2600 : 2200) + rounds.length * 1900,
        readingMs,
        resolvingMs,
        writingMs: 1500 * rounds.length,
        judgingMs: 640 * rounds.length,
        backgroundMs: spec.background ? 2100 : null,
      },
      jevModelVersion: "jev-1.13.0",
    },
    state: spec.state,
    backgroundStatus:
      spec.background === null
        ? "pending"
        : spec.background.error
          ? "failed"
          : "done",
    createdAt: fixtureTime(spec.minutes),
  }
}

export function buildTurn(sessionId: string, spec: TurnSpec): Turn {
  const [classification, classificationP] = spec.classification
  return assembleTurn(sessionId, spec, {
    input: spec.input,
    reading: {
      intent: { value: spec.intent[0], probability: spec.intent[1] },
      target: {
        value: spec.target[0],
        label: spec.target[1],
        probability: spec.target[2],
      },
      classification: {
        value: classification,
        probability: classificationP,
        belowFloor: classificationP < ENGINE_CONFIG.choiceConfidenceFloor,
      },
    },
    outcome: { ending: "none", deathRoll: null, ...spec.outcome },
  })
}

export function buildOpening(sessionId: string, spec: OpeningSpec): Turn {
  return assembleTurn(sessionId, { ...spec, idx: OPENING_IDX }, null)
}

function background(
  partial: Partial<BackgroundResults> = {}
): BackgroundResults {
  return {
    newEntryIds: [],
    arcCheck: [],
    arcAdvancedTo: null,
    pacing: null,
    error: null,
    ...partial,
  }
}

function state(
  partial: Partial<PlayerState> & Pick<PlayerState, "locationId">
): PlayerState {
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
  {
    id: SESSION_IDS.midPlay,
    worldId: WORLD,
    mode: "harness",
    seed: 1888,
    ending: "none",
    createdAt: fixtureTime(120),
    updatedAt: fixtureTime(146),
  },
  {
    id: SESSION_IDS.win,
    worldId: WORLD,
    mode: "harness",
    seed: 42,
    ending: "win",
    createdAt: fixtureTime(200),
    updatedAt: fixtureTime(214),
  },
  {
    id: SESSION_IDS.death,
    worldId: WORLD,
    mode: "harness",
    seed: 7,
    ending: "death",
    createdAt: fixtureTime(300),
    updatedAt: fixtureTime(306),
  },
  {
    id: SESSION_IDS.removed,
    worldId: WORLD,
    mode: "harness",
    seed: 99,
    ending: "removed",
    createdAt: fixtureTime(400),
    updatedAt: fixtureTime(412),
  },
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
    description:
      "A flower seller outside Spitalfields Market. She talks only where the constables cannot hear.",
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
      description:
        "A lamplighter on Whitechapel High Street who lit the lamps outside Whitlock's shop.",
      keyFacts: [],
      data: {
        ...person,
        role: "Lamplighter",
        personality: "Talkative, superstitious.",
        backstory: "Has lit the same street for thirty years.",
      },
      source: "play",
      sourceTurn: 3,
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
      description:
        "Keeps a lodging house by the docks and rents a room to a quiet young clerk.",
      keyFacts: [],
      data: {
        ...person,
        role: "Landlady",
        personality: "Sharp-tongued, counts every penny.",
        backstory: "Widowed; takes in lodgers from the shipping offices.",
      },
      source: "play",
      sourceTurn: 5,
      status: "proposed",
      jevFlags: [],
      seenAt: null,
      createdAt: fixtureTime(142),
      updatedAt: fixtureTime(142),
    }
  )
  return out
}

/**
 * A seeded Session's Opening, chosen by its seed like any new Session's, and
 * written the minute it started. Its background work found nothing: the
 * first Arc's Exit condition is not met by arriving.
 */
function seededOpening(sessionId: string, minutes: number): Turn {
  const session = SESSIONS.find((candidate) => candidate.id === sessionId)!
  const opening = pickOpening(session.seed)
  const c = (key: string) => copyId(sessionId, `${PREFIX}-${key}`)
  return buildOpening(sessionId, {
    minutes,
    directive: OPENING_DIRECTIVE,
    passage: opening.passage,
    alternative: opening.alternative,
    background: background({
      arcCheck: [
        { exitConditionId: c("exit-1"), probability: 0.07, met: false },
      ],
      pacing: { probability: 0.86, nudge: false, reason: null },
    }),
    state: state({ locationId: c("yard") }),
  })
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
    seededOpening(s, 120),
    buildTurn(s, {
      idx: 1,
      minutes: 121,
      input: "I take the case file from Captain James and read it at his desk.",
      intent: ["examine", 0.91],
      target: ["none", "none", 0.83],
      classification: ["on_script", 0.93],
      outcome: {
        kind: "narrated",
        summary: "Jacob reads the case file; nothing is decided.",
        reputationDelta: 0,
        offScriptDelta: 0,
      },
      directive:
        "Arc 1, Introduction. Captain James hands over the file with visible reluctance. Normal Band: he is civil, not warm.",
      passage:
        "Captain James slid the file across the desk as if it owed him money. Three names, three dates, three addresses east of the Tower. Jacob read it twice. The Captain watched him the whole time and said nothing useful.",
      background: background({
        arcCheck: [
          { exitConditionId: c("exit-1"), probability: 0.91, met: true },
        ],
        arcAdvancedTo: 1,
      }),
      state: state({ locationId: yard, arcIndex: 1 }),
    }),
    buildTurn(s, {
      idx: 2,
      minutes: 124,
      input: "I ask Amanda what the victims had in common.",
      intent: ["question", 0.95],
      target: [c("amanda"), "Amanda Hopkins", 0.96],
      classification: ["on_script", 0.9],
      outcome: {
        kind: "questioned",
        summary: "Amanda may reveal what she knows at normal Band.",
        reputationDelta: 0,
        offScriptDelta: 0,
      },
      directive:
        "Allowed reveal: Amanda on the victims' trade. She is precise and a little amused.",
      passage:
        'Hopkins did not need the file. "They all lent money to the same house," she said. "Rober and Sons, wool. It is in the ledgers, if anyone had bothered to read them."',
      discovery: [
        {
          target: { kind: "knowledge", entryId: c("k-amanda") },
          question:
            "Did the Draft reveal that all three victims lent money to Rober & Sons?",
          probability: 0.88,
          revealed: true,
        },
      ],
      background: background({
        arcCheck: [
          { exitConditionId: c("exit-2"), probability: 0.32, met: false },
        ],
        pacing: { probability: 0.74, nudge: false, reason: null },
      }),
      state: state({
        locationId: yard,
        arcIndex: 1,
        knowledgeRevealed: { [c("amanda")]: [c("k-amanda")] },
      }),
    }),
    buildTurn(s, {
      idx: 3,
      minutes: 129,
      input: "I walk to Whitechapel High Street.",
      intent: ["move", 0.97],
      target: [whitechapel, "Whitechapel High Street", 0.95],
      classification: ["on_script", 0.88],
      outcome: {
        kind: "moved",
        summary: "Jacob moves to Whitechapel High Street.",
        reputationDelta: 0,
        offScriptDelta: 0,
      },
      directive:
        "Scene: Whitechapel High Street, morning. Describe only this street.",
      passage: "",
      rounds: [
        buildRound(1, [
          buildDraft(
            `${s}-t3-r1a`,
            "Jacob walked east past the Ten Bells, where a barman swore he had seen the killer twice.",
            buildRules({ location: 0.81, codex: 0.36 }, { seed: 4 })
          ),
          buildDraft(
            `${s}-t3-r1b`,
            '"Right then," Jacob said to the cabman, and told him to wait while he walked the length of the street.',
            buildRules({ agency: 0.67 }, { seed: 5 })
          ),
        ]),
        buildRound(
          2,
          [
            buildDraft(
              `${s}-t3-r2a`,
              "Whitechapel High Street was all barrows and breath. A lamplighter was still at work outside the draper's shop, where Whitlock had died, and the shutters were painted over in black.",
              buildRules({ location: 0.12 }, { seed: 6 }),
              true
            ),
            buildDraft(
              `${s}-t3-r2b`,
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
        arcCheck: [
          { exitConditionId: c("exit-2"), probability: 0.41, met: false },
        ],
        pacing: { probability: 0.69, nudge: false, reason: null },
      }),
      state: state({
        locationId: whitechapel,
        arcIndex: 1,
        knowledgeRevealed: { [c("amanda")]: [c("k-amanda")] },
      }),
    }),
    buildTurn(s, {
      idx: 4,
      minutes: 133,
      input: "I examine the ground outside Whitlock's shop.",
      intent: ["examine", 0.94],
      target: ["none", "none", 0.8],
      classification: ["on_script", 0.9],
      outcome: {
        kind: "examined",
        summary: "C5, the docker's cap, is discoverable here.",
        reputationDelta: 0,
        offScriptDelta: 0,
      },
      directive:
        "Discoverable: C5 (a labelled red herring). Let the constables be pleased with it.",
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
        arcCheck: [
          { exitConditionId: c("exit-2"), probability: 0.83, met: true },
        ],
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
      idx: 5,
      minutes: 139,
      input:
        "I take a constable's lantern and search the docks alone after dark.",
      intent: ["move", 0.86],
      target: [docks, "St Katharine Docks", 0.9],
      classification: ["reckless", 0.77],
      outcome: {
        kind: "reckless_survived",
        summary:
          "Death roll 0.63 against odds of 0.50: Jacob survives the night.",
        reputationDelta: 0,
        offScriptDelta: 0,
        deathRoll: { odds: 0.5, roll: 0.63, lethal: false },
      },
      directive:
        "Scene: St Katharine Docks at night. Danger is close but nothing happens to Jacob. C2 is discoverable.",
      passage: "",
      rounds: [
        buildRound(1, [
          buildDraft(
            `${s}-t5-r1a`,
            "Jacob drew his revolver and fired at the shape by the warehouse.",
            buildRules({ agency: 0.74 }, { seed: 8 })
          ),
          buildDraft(
            `${s}-t5-r1b`,
            "Somewhere in the dark, Max Rober was watching him, and Jacob knew it.",
            buildRules({ knowledge: 0.69, unplanned_clue: 0.55 }, { seed: 9 })
          ),
        ]),
        buildRound(
          2,
          [
            buildDraft(
              `${s}-t5-r2a`,
              "Jacob called out to the watchman and asked him to walk the quay with him.",
              buildRules({ agency: 0.58 }, { seed: 10 })
            ),
            buildDraft(
              `${s}-t5-r2b`,
              "The electric lamps along the quay buzzed and flickered as Jacob passed.",
              buildRules({ period: 0.62 }, { seed: 11 })
            ),
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
              `${s}-t5-r3a`,
              "The lantern made a small, lonely room of light. Jacob moved along the quay, and twice he stopped, sure he had heard a step behind him that was not his own. Nothing came of it. By the chandlery a scrap of paper fluttered on a nail.",
              buildRules({ agency: 0.52 }, { seed: 12 }),
              true
            ),
            buildDraft(
              `${s}-t5-r3b`,
              "A young man in a clerk's coat slipped between the warehouses as Jacob raised the lantern.",
              buildRules({ knowledge: 0.61 }, { seed: 13 })
            ),
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
        arcCheck: [
          { exitConditionId: c("exit-3"), probability: 0.04, met: false },
        ],
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
      idx: 6,
      minutes: 146,
      input: "I ask Dr. Pryce what the three wounds have in common.",
      intent: ["question", 0.93],
      target: [c("pryce"), "Dr. Henry Pryce", 0.94],
      classification: ["on_script", 0.91],
      outcome: {
        kind: "questioned",
        summary: "Pryce may reveal what he knows at low Band or above.",
        reputationDelta: 5,
        offScriptDelta: 0,
      },
      directive:
        "Allowed reveal: Pryce on the wounds (C1). He enjoys Jacob's bluntness.",
      passage:
        'Pryce laid the three drawings side by side. "Same blade," he said. "Short, hooked, and kept very sharp. Your man is right-handed, and he is not in a hurry."',
      discovery: [
        {
          target: { kind: "knowledge", entryId: c("k-pryce") },
          question:
            "Did the Draft reveal that the same blade killed all three men?",
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
        knowledgeRevealed: {
          [c("amanda")]: [c("k-amanda")],
          [c("pryce")]: [c("k-pryce")],
        },
        reputation: 65,
      }),
    }),
  ]
}

function winTurns(): Turn[] {
  const s = SESSION_IDS.win
  const c = (key: string) => copyId(s, `${PREFIX}-${key}`)
  const done = (arcIndex: number) =>
    background({
      pacing: { probability: 0.82, nudge: false, reason: null },
      arcAdvancedTo: arcIndex > 0 ? arcIndex : null,
    })
  return [
    seededOpening(s, 200),
    buildTurn(s, {
      idx: 1,
      minutes: 202,
      input: "I ask Dr. Pryce about the wounds.",
      intent: ["question", 0.94],
      target: [c("pryce"), "Dr. Henry Pryce", 0.95],
      classification: ["on_script", 0.92],
      outcome: {
        kind: "questioned",
        summary: "Pryce may reveal the wounds.",
        reputationDelta: 5,
        offScriptDelta: 0,
      },
      directive: "Allowed reveal: C1.",
      passage: '"One blade," Pryce said. "Hooked. The same hand every time."',
      discovery: [
        {
          target: { kind: "clue", entryId: c("c1") },
          question: "Did the Draft reveal the matching wounds?",
          probability: 0.91,
          revealed: true,
        },
      ],
      background: done(0),
      state: state({
        locationId: c("yard"),
        arcIndex: 1,
        cluesFound: [c("c1")],
        reputation: 65,
      }),
    }),
    buildTurn(s, {
      idx: 2,
      minutes: 206,
      input: "I search the quay by Pembury's chandlery.",
      intent: ["examine", 0.9],
      target: ["none", "none", 0.8],
      classification: ["on_script", 0.9],
      outcome: {
        kind: "examined",
        summary: "C2 is discoverable at the docks.",
        reputationDelta: 5,
        offScriptDelta: 0,
      },
      directive: "Discoverable: C2.",
      passage:
        "On a nail by the chandlery door hung a torn page of accounts. Three names on it had been underlined, hard.",
      discovery: [
        {
          target: { kind: "clue", entryId: c("c2") },
          question: "Did the Draft reveal the ledger page?",
          probability: 0.89,
          revealed: true,
        },
      ],
      background: done(2),
      state: state({
        locationId: c("docks"),
        arcIndex: 2,
        cluesFound: [c("c1"), c("c2")],
        reputation: 70,
      }),
    }),
    buildTurn(s, {
      idx: 3,
      minutes: 210,
      input: "I find Nell Garvey and ask what she saw the morning Carrow died.",
      intent: ["question", 0.92],
      target: [c("nell"), "Nell Garvey", 0.93],
      classification: ["on_script", 0.91],
      outcome: {
        kind: "questioned",
        summary: "Nell may reveal what she saw at normal Band.",
        reputationDelta: 5,
        offScriptDelta: 0,
      },
      directive: "Allowed reveal: C3. High Band: Nell is warm with Jacob.",
      passage:
        '"A clerk," Nell said, turning a violet in her fingers. "Young. Good coat. Came out of Carrow\'s before it was light."',
      discovery: [
        {
          target: { kind: "clue", entryId: c("c3") },
          question: "Did the Draft reveal the young clerk?",
          probability: 0.9,
          revealed: true,
        },
      ],
      background: done(0),
      state: state({
        locationId: c("spitalfields"),
        arcIndex: 2,
        cluesFound: [c("c1"), c("c2"), c("c3")],
        reputation: 75,
      }),
    }),
    buildTurn(s, {
      idx: 4,
      minutes: 214,
      input: "I arrest Max Rober at the shipping office.",
      intent: ["arrest", 0.95],
      target: [c("max"), "Max Rober", 0.94],
      classification: ["on_script", 0.95],
      outcome: {
        kind: "decisive_success",
        summary:
          "Three of the four required Clues are found: the arrest succeeds and the story is won.",
        reputationDelta: 0,
        offScriptDelta: 0,
        ending: "win",
      },
      directive: "Ending: win. Narrate the arrest. Max goes quietly.",
      passage:
        "Max Rober put down his pen when he saw them, and squared the papers on his desk before he stood. He did not ask why. On the walk to the Yard he said only one thing: that his father would read about it in the morning.",
      background: done(0),
      state: state({
        locationId: c("docks"),
        arcIndex: 2,
        cluesFound: [c("c1"), c("c2"), c("c3")],
        reputation: 75,
        ending: "win",
      }),
    }),
  ]
}

function deathTurns(): Turn[] {
  const s = SESSION_IDS.death
  const c = (key: string) => copyId(s, `${PREFIX}-${key}`)
  return [
    seededOpening(s, 300),
    buildTurn(s, {
      idx: 1,
      minutes: 302,
      input: "I go to Spitalfields Market.",
      intent: ["move", 0.96],
      target: [c("spitalfields"), "Spitalfields Market", 0.95],
      classification: ["on_script", 0.9],
      outcome: {
        kind: "moved",
        summary: "Jacob moves to Spitalfields Market.",
        reputationDelta: 0,
        offScriptDelta: 0,
      },
      directive: "Scene: Spitalfields Market before dawn.",
      passage:
        "The market was waking in the dark: carts, lanterns, a boy asleep on a sack of onions.",
      background: background({ arcAdvancedTo: 1 }),
      state: state({ locationId: c("spitalfields"), arcIndex: 1 }),
    }),
    buildTurn(s, {
      idx: 2,
      minutes: 306,
      input:
        "I follow the young clerk into Carrow's warehouse alone, unarmed, in the dark.",
      intent: ["move", 0.8],
      target: [c("spitalfields"), "Spitalfields Market", 0.72],
      classification: ["reckless", 0.88],
      outcome: {
        kind: "reckless_death",
        summary:
          "Death roll 0.12 against odds of 0.35: the action is lethal. The story ends in death.",
        reputationDelta: 0,
        offScriptDelta: 0,
        deathRoll: { odds: 0.35, roll: 0.12, lethal: true },
        ending: "death",
      },
      directive: "Ending: death. Narrate it without gore.",
      passage:
        "The warehouse door was open, which should have told him something. Inside it smelled of tea and cold iron. Jacob heard the step behind him a moment too late, and then he heard nothing at all.",
      background: background(),
      state: state({
        locationId: c("spitalfields"),
        arcIndex: 1,
        ending: "death",
      }),
    }),
  ]
}

function removedTurns(): Turn[] {
  const s = SESSION_IDS.removed
  const c = (key: string) => copyId(s, `${PREFIX}-${key}`)
  const yard = c("yard")
  const offScript = (
    idx: number,
    minutes: number,
    input: string,
    passage: string,
    directive: string,
    count: number,
    rep: number,
    warnings: number[],
    ending: "none" | "removed" = "none"
  ) =>
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
      state: state({
        locationId: yard,
        reputation: rep,
        offScriptCount: count,
        warningsGiven: warnings,
        ending,
      }),
    })
  return [
    seededOpening(s, 400),
    offScript(
      1,
      402,
      "I insult Captain James in front of his men.",
      "The room went quiet. Captain James looked at Jacob the way a man looks at a stain.",
      "Off-script. Low patience from the Captain.",
      1,
      50,
      []
    ),
    offScript(
      2,
      405,
      "I tear up the case file.",
      '"That," said the Captain, very softly, "was the only copy. You have had your warning, Mr. Flannery."',
      "Off-script count 2: the Captain warns Jacob in the story.",
      2,
      40,
      [2]
    ),
    offScript(
      3,
      408,
      "I tell the newspapers the Yard is useless.",
      'The morning papers carried his words by nine. By ten the Captain had them pinned to his door. "Once more," he said, "and you are on the boat home."',
      "Off-script count 3: final warning in the story.",
      3,
      30,
      [2, 3]
    ),
    offScript(
      4,
      412,
      "I walk out of the Yard and spend the day in a public house.",
      'When Jacob came back, his desk had been cleared. The Captain did not look up. "The Home Office thanks you for your time," he said. "Your ship sails on Thursday."',
      "Ending: removed. The Captain takes Jacob off the case.",
      4,
      20,
      [2, 3],
      "removed"
    ),
  ]
}

// Turn script (ticket 04): the Turns the Turn route plays.
//
// The route does not understand the Player's input. It picks the first
// unplayed step whose keywords appear in the input, or a generic tangential
// step when none match, and builds the Turn from the Session's current state.
// References are template keys ("yard", "c1", "k-amanda"), resolved to this
// Session's copies, so the script plays in any Session of a London World.
// Forced scenarios swap in the Ending steps or extra Rounds.

/** A character the Drafter names from a Passage during background work. */
export type ScriptNpc = {
  name: string
  description: string
  role: string
  personality: string
  backstory: string
}

export type ScriptStep = {
  key: string
  /** Lowercase words or phrases in the Player's input that pick this step. */
  keywords: string[]
  intent: [string, number]
  /** Template key of the targeted Entry (or "none"), with the Judge's probability. */
  target: [string, number]
  classification: [Classification, number]
  outcome: {
    kind: Outcome["kind"]
    summary: string
    reputationDelta?: number
    offScriptDelta?: number
  }
  directive: string
  /** Template key of the Location the Passage is set in; the Player's Location when omitted. */
  location?: string
  passage: string
  /** The other Draft of a clean Round. */
  alternative: string
  /** Template keys of the Clues and Knowledge the Passage reveals. */
  reveals?: string[]
  /** Round 1 rejects one of its two Drafts and ships the other. */
  oneRejected?: boolean
  /** Characters the Drafter names from the Passage in background work. */
  newNpcs?: ScriptNpc[]
}

export const TURN_SCRIPT: ScriptStep[] = [
  {
    key: "case-file",
    keywords: ["file", "case", "captain", "james", "desk", "read"],
    intent: ["examine", 0.9],
    target: ["geoffrey", 0.64],
    classification: ["on_script", 0.92],
    outcome: {
      kind: "narrated",
      summary: "Jacob reads the case file; nothing is decided.",
    },
    directive:
      "Arc 1, Introduction. Captain James hands over the file with visible reluctance. Normal Band: he is civil, not warm.",
    location: "yard",
    passage:
      "Captain James kept the file in a drawer he had to unlock, as though the dead might get out. Three merchants in three weeks, all east of the Tower: Whitlock the draper, Carrow the tea importer, Ashby the ship's broker. Each killed before dawn by a single wound, and none of them robbed of so much as a watch. Jacob read it twice. The Captain watched him from the window and offered nothing but the weather.",
    alternative:
      "The file was thin for three dead men. Captain James let Jacob read it standing, and did not ask what he thought.",
  },
  {
    key: "amanda",
    keywords: [
      "amanda",
      "hopkins",
      "victims",
      "trade",
      "common",
      "money",
      "ledgers",
    ],
    intent: ["question", 0.95],
    target: ["amanda", 0.95],
    classification: ["on_script", 0.91],
    outcome: {
      kind: "questioned",
      summary: "Amanda may reveal what she knows at normal Band.",
    },
    directive:
      "Allowed reveal: Amanda on the victims' trade. She is precise and a little amused.",
    location: "yard",
    reveals: ["k-amanda"],
    passage:
      'Amanda Hopkins had the victims\' papers spread across her desk before Jacob finished the question. "Whitlock, Carrow, Ashby," she said, tapping each in turn. "Different trades, different parishes. But every one of them lent money to the same house: Rober and Sons, wool, down at St Katharine\'s." She closed the folder. "Nobody upstairs thinks that matters. Nobody upstairs has read a ledger since the Crimea."',
    alternative:
      '"Money," Hopkins said, without looking up. "It is always money, and this time it is Rober and Sons."',
  },
  {
    key: "pryce",
    keywords: [
      "pryce",
      "surgeon",
      "doctor",
      "wound",
      "wounds",
      "bodies",
      "body",
      "mortuary",
      "blade",
      "knife",
    ],
    intent: ["question", 0.94],
    target: ["pryce", 0.95],
    classification: ["on_script", 0.92],
    outcome: {
      kind: "questioned",
      summary: "Pryce may reveal what he knows at low Band or above.",
    },
    directive:
      "Allowed reveal: Pryce on the wounds (C1). He enjoys Jacob's bluntness.",
    location: "yard",
    reveals: ["k-pryce", "c1"],
    passage:
      'Dr. Pryce received him in the cold room below the Yard, drying his hands on a towel that had seen better decades. "Same blade, all three," he said. "Short, hooked, kept very sharp. One stroke, from the right, by a man of middling height who was not in a hurry." He folded the towel with great care. "Whoever he is, Mr. Flannery, he has thought about this for a long time."',
    alternative:
      'Pryce laid three drawings side by side. "One blade," he said. "Hooked. The same hand every time."',
  },
  {
    key: "whitechapel",
    keywords: ["whitechapel", "high street", "draper", "whitlock"],
    intent: ["move", 0.96],
    target: ["whitechapel", 0.95],
    classification: ["on_script", 0.89],
    outcome: {
      kind: "moved",
      summary: "Jacob moves to Whitechapel High Street.",
    },
    directive:
      "Scene: Whitechapel High Street, morning. Describe only this street.",
    location: "whitechapel",
    oneRejected: true,
    passage:
      "Whitechapel High Street was all barrows, breath and wet straw. The draper's shop where Whitlock died still had its shutters up, painted over in black, and a woman in mourning was sweeping the step as though she could sweep the whole business away. Costermongers called their prices. Nobody looked at the shop, which was how Jacob knew that everybody remembered it.",
    alternative:
      "The street smelled of wet straw and coal smoke. The draper's shutters were painted black.",
    newNpcs: [
      {
        name: "Ada Pruitt",
        description:
          "Whitlock's widowed sister, who keeps the draper's shop open for the sake of its creditors.",
        role: "Draper's sister",
        personality: "Brisk, proud, tired of policemen.",
        backstory: "Kept house for her brother for eleven years.",
      },
    ],
  },
  {
    key: "ground",
    keywords: [
      "ground",
      "gutter",
      "search",
      "examine",
      "look around",
      "step",
      "shop",
    ],
    intent: ["examine", 0.93],
    target: ["none", 0.81],
    classification: ["on_script", 0.9],
    outcome: {
      kind: "examined",
      summary: "C5, the docker's cap, is discoverable here.",
    },
    directive:
      "Discoverable: C5 (a labelled red herring). Let the constables be pleased with it.",
    location: "whitechapel",
    reveals: ["c5"],
    passage:
      "In the gutter by the shop step lay a docker's cap, sodden and trodden flat, with a green ribbon stitched inside the band. The constable at the door looked delighted with it. Jacob turned it over with the end of his cane. It had lain there a good deal longer than a week, and the constable, who had not thought of that, went on looking delighted.",
    alternative:
      "A docker's cap lay in the gutter. The constable on the door was very pleased with it.",
  },
  {
    key: "nell",
    keywords: [
      "nell",
      "garvey",
      "flower",
      "flowers",
      "violets",
      "spitalfields",
      "market",
      "witness",
    ],
    intent: ["question", 0.93],
    target: ["nell", 0.94],
    classification: ["on_script", 0.91],
    outcome: {
      kind: "questioned",
      summary: "Nell may reveal what she saw at normal Band.",
    },
    directive: "Allowed reveal: C3. Normal Band: Nell is wary, then fair.",
    location: "spitalfields",
    reveals: ["k-nell", "c3"],
    passage:
      'Nell Garvey sold violets from a basket at the market\'s edge and priced her answers higher than her flowers. She let Jacob wait while she served two housemaids. "A clerk," she said at last, turning a stem in her fingers. "Young. Good coat, better boots. Came out of Carrow\'s side door before it was light, the morning they found him. Walked like he had somewhere to be and all day to get there."',
    alternative:
      '"A clerk," Nell said. "Young, good coat. Out of Carrow\'s before it was light."',
  },
  {
    key: "docks",
    keywords: [
      "docks",
      "dock",
      "quay",
      "katharine",
      "chandlery",
      "pembury",
      "wharf",
      "river",
    ],
    intent: ["examine", 0.88],
    target: ["docks", 0.9],
    classification: ["on_script", 0.88],
    outcome: {
      kind: "examined",
      summary: "C2 is discoverable at St Katharine Docks.",
    },
    directive: "Scene: St Katharine Docks by day. Discoverable: C2.",
    location: "docks",
    reveals: ["c2"],
    passage:
      "St Katharine Docks smelled of tar, tea and river. The ships' chandler was shouting at a boy about rope and did not stop to look at Jacob. By the chandlery door, caught on a nail at the height of a man's hand, a torn page of accounts lifted and fell in the wind. Three names on it had been underlined, hard enough to cut the paper: Whitlock, Carrow, Ashby.",
    alternative:
      "On a nail by the chandlery hung a torn page of accounts. Three names were underlined.",
    newNpcs: [
      {
        name: "Silas Pembury",
        description:
          "The ships' chandler on the quay at St Katharine Docks. Loud, and sees who comes and goes.",
        role: "Ships' chandler",
        personality: "Loud, quick to anger, quicker to forget.",
        backstory: "Has kept the chandlery on the quay since the docks opened.",
      },
    ],
  },
  {
    key: "straw",
    keywords: ["straw", "cufflink", "behind", "carrow"],
    intent: ["examine", 0.91],
    target: ["spitalfields", 0.77],
    classification: ["on_script", 0.9],
    outcome: {
      kind: "examined",
      summary: "C4 is discoverable behind Carrow's warehouse.",
    },
    directive:
      "Scene: behind Carrow's warehouse at Spitalfields Market. Discoverable: C4.",
    location: "spitalfields",
    reveals: ["c4"],
    passage:
      "Behind Carrow's warehouse the straw had been raked into a heap and left to rot. Jacob went through it on his knees while a carter watched with open interest. At the bottom, where the damp had kept it, lay a silver cufflink, one of a pair. The engraving was worn, but plain enough: J.R.",
    alternative:
      "In the rotting straw behind the warehouse lay a silver cufflink engraved J.R.",
  },
  {
    key: "josiah",
    keywords: ["josiah", "father", "merchant", "wool", "rober and sons"],
    intent: ["question", 0.9],
    target: ["josiah", 0.92],
    classification: ["on_script", 0.86],
    outcome: {
      kind: "questioned",
      summary: "Josiah reveals nothing below high Band.",
    },
    directive:
      "No allowed reveals: Josiah's Knowledge needs high Band. He is proud and gives nothing about his family.",
    location: "docks",
    passage:
      "Josiah Rober received him standing, in an office that smelled of lanolin and money, and did not offer a chair. He answered every question about his debtors with a date and a figure. When the questions turned toward his family, the merchant looked at the clock on the wall until the silence did the work of showing Jacob out.",
    alternative:
      "Josiah Rober answered with dates and figures, and nothing else.",
  },
]

/** When no step matches the input: the story goes on, and nothing is decided. */
export const TANGENTIAL_STEPS: ScriptStep[] = [
  {
    key: "fog",
    keywords: [],
    intent: ["other", 0.74],
    target: ["none", 0.86],
    classification: ["tangential", 0.71],
    outcome: {
      kind: "narrated",
      summary: "Nothing in the story depends on this; it is narrated.",
    },
    directive:
      "Tangential action. Narrate it briefly; no reveals, no new places.",
    passage:
      "The fog came up from the river in the afternoon and did not go home. Jacob found a coffee stall under the railway arches and drank something that had been introduced to coffee once, briefly. Around him London went about its business, and none of its business was his case.",
    alternative:
      "The fog came up from the river. Jacob drank bad coffee under the arches.",
  },
  {
    key: "lamps",
    keywords: [],
    intent: ["other", 0.7],
    target: ["none", 0.84],
    classification: ["tangential", 0.68],
    outcome: {
      kind: "narrated",
      summary: "Nothing in the story depends on this; it is narrated.",
    },
    directive:
      "Tangential action. Narrate it briefly; no reveals, no new places.",
    passage:
      "A newsboy was selling the killings on every corner, with a drawing of the murderer on the front page who looked like nobody at all. The gas lamps came on one by one. Jacob stood a while and watched the crowd, and the case sat in his pocket like a stone.",
    alternative:
      "The gas lamps came on one by one, and the case sat in Jacob's pocket like a stone.",
  },
]

// The Opening (spec §9.0): the first scene, before the Player acts.
//
// Several are written so that two Sessions of one World visibly start
// differently; the Session's seed picks one, so a replay starts the same way.
// None reveals anything: Jacob arrives, and the case is only in the air.

export type OpeningScript = {
  key: string
  passage: string
  alternative: string
}

export const OPENING_DIRECTIVE =
  "Opening. Set the first scene: Jacob arrives at Scotland Yard, Arc 1 (Introduction) under way. No reveals. Jacob does nothing beyond arriving. Normal Band."

export const OPENINGS: OpeningScript[] = [
  {
    key: "hansom",
    passage:
      "The fog had come up from the river before noon and taken Whitehall street by street. By the time the hansom set Jacob Flannery down at Great Scotland Yard, the gas lamps were lit and doing no good at all. The driver counted his coins twice and looked at him the way London looks at an American. By the railings a newsboy was crying the killings in a voice worn thin with practice. Three, he said. Three in as many weeks. Nobody stopped to buy. On the steps a constable in a wet cape watched Jacob come up out of the fog and did not trouble to hide his opinion of it. Somewhere inside a door banged, and a man laughed without much humour. Jacob stood a moment with his bag in his hand. Eleven days of sea were still in his legs. Then he went in.",
    alternative:
      "The fog had Whitehall to itself. Jacob Flannery climbed down from the hansom at Great Scotland Yard and stood with his bag in his hand while a newsboy cried the killings to nobody.",
  },
  {
    key: "bench",
    passage:
      "They kept him waiting on a bench outside the Captain's door, which Jacob took as a kind of welcome. The corridor smelled of wet wool and lamp oil. The fog had come in with every coat that passed and hung under the ceiling, as though it too had business with the Yard. Clerks went by holding files against their chests like hymn books. Two constables stopped talking when they saw him, and started again, lower, once they were past. He caught the words New York, and then the word merchants. On the wall opposite, someone had pinned up the morning paper and someone else had torn the headline off. Jacob sat with his hat on his knee. His collar was still damp from the street. Behind the door a voice was being very patient with somebody. He watched the clock above the stairs and waited to be sent for.",
    alternative:
      "They kept Jacob waiting on a bench outside the Captain's door. The corridor smelled of wet wool, and the constables lowered their voices as they went by.",
  },
  {
    key: "on-foot",
    passage:
      "London met him with its back turned. Jacob Flannery walked the last of the way, because the cabman could not see the road and said so. The fog was yellow at the edges and brown in the middle, and it tasted of coal. Things came out of it one at a time: a railing, a lamp, the breath of a horse, a constable's helmet floating at the height of a man. Great Scotland Yard, when it arrived, was a wall of wet brick and lit windows, with more men going in than coming out. Each of them glanced at the stranger in American boots with a carpet bag. Three merchants were dead in this city, and the city was going about its business as if they were not. Jacob turned up his collar. He did not hurry. He had crossed an ocean to be looked at like this.",
    alternative:
      "Jacob walked the last of the way through the fog. Great Scotland Yard came out of it a lit window at a time.",
  },
]

/** The Opening a Session plays, chosen by its seed. */
export function pickOpening(seed: number): OpeningScript {
  return OPENINGS[Math.abs(Math.trunc(seed)) % OPENINGS.length]
}

export type ForcedEnding = Exclude<Ending, "none">

/** The Endings the `ending-*` scenarios force on the next Turn. */
export const ENDING_STEPS: Record<ForcedEnding, ScriptStep> = {
  win: {
    key: "ending-win",
    keywords: [],
    intent: ["arrest", 0.95],
    target: ["max", 0.94],
    classification: ["on_script", 0.95],
    outcome: {
      kind: "decisive_success",
      summary:
        "The arrest of the right man with the Clues it needs succeeds: the story is won.",
    },
    directive: "Ending: win. Narrate the arrest. Max goes quietly.",
    location: "docks",
    passage:
      "Max Rober was at his desk in the shipping office when they came for him. He put down his pen, wiped the nib, and squared the papers in front of him before he stood. He did not ask why. On the walk to the Yard he said only one thing, to nobody in particular: that his father would read about it in the morning, and that he hoped the old man would read it twice.",
    alternative: "Max Rober put down his pen and stood. He did not ask why.",
  },
  death: {
    key: "ending-death",
    keywords: [],
    intent: ["move", 0.78],
    target: ["spitalfields", 0.72],
    classification: ["reckless", 0.88],
    outcome: { kind: "reckless_death", summary: "" },
    directive: "Ending: death. Narrate it without gore.",
    location: "spitalfields",
    passage:
      "The warehouse door stood open, which should have told him something. Inside it smelled of tea and cold iron, and the dark went further back than the building did. Jacob heard the step behind him a moment too late. The lantern went over. After that there was only the river, somewhere close, going on about its business as it always had.",
    alternative: "Jacob heard the step behind him a moment too late.",
  },
  removed: {
    key: "ending-removed",
    keywords: [],
    intent: ["other", 0.83],
    target: ["geoffrey", 0.7],
    classification: ["off_script", 0.86],
    outcome: {
      kind: "off_script",
      summary: "",
      reputationDelta: ENGINE_CONFIG.offScriptPenalty,
      offScriptDelta: 1,
    },
    directive: "Ending: removed. The Captain takes Jacob off the case.",
    location: "yard",
    passage:
      'When Jacob came back to the Yard his desk had been cleared and his coat hung on the door. Captain James did not look up from his papers. "The Home Office thanks you for your time, Mr. Flannery," he said. "Your ship sails on Thursday. Someone will see you to it."',
    alternative: "His desk had been cleared. The Captain did not look up.",
  },
}

// Operations

export function getSession(id: string): Session {
  const session = getStore().sessions.get(id)
  if (!session)
    throw new StoreError(
      "not_found",
      `There is no Session "${id}". Start a new one from its World.`
    )
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
export function createSession(request: {
  worldId: string
  mode: "harness" | "baseline"
}): CreateSessionResponse {
  const world = getWorld(request.worldId)
  if (world.setupStatus === "draft" || world.setupStatus === "drafting") {
    throw new StoreError(
      "conflict",
      "This World has not finished setup. Run setup and review its Entries before starting a Session."
    )
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
  const worldEntries = [...store.entries.values()].filter(
    (entry) => entry.worldId === world.id && entry.sessionId === null
  )
  const entries = copyEntriesForSession(worldEntries, session.id, {
    now,
    newId: (entry) => copyId(session.id, entry.id),
  })

  store.sessions.set(session.id, session)
  store.turns.set(session.id, [])
  for (const entry of entries) store.entries.set(entry.id, entry)
  if (world.setupStatus === "review")
    saveWorld({ ...world, setupStatus: "ready", updatedAt: now })
  return { session, entries }
}

/** A Session with the World it is played in, as `GET /api/sessions/[id]` returns it. */
export function getSessionView(id: string) {
  const session = getSession(id)
  const siblings = [...getStore().sessions.values()]
    .filter((other) => other.worldId === session.worldId)
    .sort(
      (a, b) =>
        a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)
    )
  return {
    session,
    sessionNumber: siblings.findIndex((other) => other.id === session.id) + 1,
    world: getWorld(session.worldId),
    turns: listTurns(id),
    entries: listSessionEntries(id),
  }
}

// Playing a Turn (the fixture stand-in for spec §9).

/** How long background work runs after a Passage ships. */
export const BACKGROUND_MS = 3500

/** The template key of a Session copy: "s-1.mk-k-nell" copies "mk-k-nell", key "k-nell". */
function templateKey(entry: Entry): string | null {
  if (!entry.templateId) return null
  const dash = entry.templateId.indexOf("-")
  return dash === -1 ? entry.templateId : entry.templateId.slice(dash + 1)
}

function liveSessionEntries(sessionId: string) {
  const entries = listSessionEntries(sessionId).filter(isLiveEntry)
  const byKey = new Map<string, Entry>()
  for (const entry of entries) {
    const key = templateKey(entry)
    if (key) byKey.set(key, entry)
  }
  return { entries, byKey }
}

function playerName(entries: readonly Entry[]) {
  const player = entries.find(
    (entry) => entry.kind === "character" && entry.data.isPlayer
  )
  return player?.name || "the Player character"
}

/** The Player state before the first Turn: at the start Location, first Arc, starting Reputation. */
export function initialState(entries: readonly Entry[]): PlayerState {
  const locations = entries.filter(
    (entry) => entry.kind === "location" && isLiveEntry(entry)
  )
  const start =
    locations.find(
      (entry) => entry.kind === "location" && entry.data.isStart
    ) ?? locations[0]
  if (!start)
    throw new StoreError(
      "conflict",
      "This Session has no Location to start in. Accept a Location in the Codex, then try again."
    )
  return state({ locationId: start.id })
}

function clampReputation(value: number) {
  const [low, high] = ENGINE_CONFIG.reputationRange
  return Math.min(high, Math.max(low, value))
}

/** Picks the step for an input: the unplayed step with the most keyword hits, else a tangential one. */
export function pickStep(
  input: string,
  playedPassages: ReadonlySet<string>,
  turnCount: number
): ScriptStep {
  const text = ` ${input.toLowerCase().replace(/[^a-z0-9' ]+/g, " ")} `
  let best: ScriptStep | null = null
  let bestHits = 0
  for (const step of TURN_SCRIPT) {
    if (playedPassages.has(step.passage)) continue
    const hits = step.keywords.filter(
      (keyword) =>
        text.includes(` ${keyword} `) || text.includes(` ${keyword}'s `)
    ).length
    if (hits > bestHits) {
      best = step
      bestHits = hits
    }
  }
  return best ?? TANGENTIAL_STEPS[turnCount % TANGENTIAL_STEPS.length]
}

export type RoundsMode = "script" | "second-round" | "flagged"

const FAILING_DRAFTS: {
  text: string
  rule: Rule
  probability: number
  feedback: string
}[] = [
  {
    text: "Jacob drew his revolver and fired a warning shot into the fog.",
    rule: "agency",
    probability: 0.74,
    feedback:
      "Agency (0.74): the Draft has Jacob fire a revolver the Player never drew. Rewrite without adding his actions.",
  },
  {
    text: "Jacob hailed a cab for the Ten Bells, where every rumour in Whitechapel was for sale.",
    rule: "location",
    probability: 0.79,
    feedback:
      "Location (0.79): the Draft introduces the Ten Bells as a place to go. Keep to the Codex's Locations.",
  },
  {
    text: '"I know who did it," Jacob announced, though he knew nothing of the kind.',
    rule: "agency",
    probability: 0.66,
    feedback:
      "Agency (0.66): the Draft has Jacob speak beyond the Player's input. Rewrite without adding his words.",
  },
  {
    text: "Electric light spilled from the shop windows as Jacob passed.",
    rule: "period",
    probability: 0.72,
    feedback:
      "Period (0.72): electric shop lighting is an anachronism for 1888 London. Use gas or oil.",
  },
]

function failingDraft(
  id: string,
  index: number,
  seed: number,
  options: Omit<RuleOptions, "seed">
) {
  const spec = FAILING_DRAFTS[index % FAILING_DRAFTS.length]
  return {
    draft: buildDraft(
      id,
      spec.text,
      buildRules({ [spec.rule]: spec.probability }, { ...options, seed })
    ),
    feedback: spec.feedback,
  }
}

/** The Rounds of a played Turn or an Opening: the script's own, or the forced second Round or flagged Turn. */
function roundsFor(
  key: string,
  step: Pick<ScriptStep, "passage" | "alternative" | "oneRejected">,
  mode: RoundsMode,
  seed: number,
  options: Omit<RuleOptions, "seed">
): Round[] {
  const rules = (overrides: Partial<Record<Rule, number>> = {}, offset = 0) =>
    buildRules(overrides, { ...options, seed: seed + offset })
  if (mode === "script") {
    if (step.oneRejected) {
      return [
        buildRound(1, [
          buildDraft(`${key}-r1a`, step.alternative, rules({ codex: 0.68 })),
          buildDraft(`${key}-r1b`, step.passage, rules({}, 1), true),
        ]),
      ]
    }
    return [
      buildRound(1, [
        buildDraft(`${key}-r1a`, step.passage, rules(), true),
        buildDraft(`${key}-r1b`, step.alternative, rules({}, 3)),
      ]),
    ]
  }

  const failed = (round: number) => {
    const a = failingDraft(
      `${key}-r${round}a`,
      round * 2 - 2,
      seed + round,
      options
    )
    const b = failingDraft(
      `${key}-r${round}b`,
      round * 2 - 1,
      seed + round + 1,
      options
    )
    return { drafts: [a.draft, b.draft], feedback: [a.feedback, b.feedback] }
  }
  const round1 = failed(1)
  if (mode === "second-round") {
    return [
      buildRound(1, round1.drafts),
      buildRound(
        2,
        [
          buildDraft(`${key}-r2a`, step.passage, rules({}, 5), true),
          buildDraft(`${key}-r2b`, step.alternative, rules({}, 6)),
        ],
        round1.feedback
      ),
    ]
  }
  const round2 = failed(2)
  // Round 3 fails too; the least-violating Draft (the step's Passage, just over the line) ships and the Turn is flagged.
  return [
    buildRound(1, round1.drafts),
    buildRound(2, round2.drafts, round1.feedback),
    buildRound(
      3,
      [
        buildDraft(
          `${key}-r3a`,
          step.passage,
          rules({ agency: 0.53 }, 7),
          true
        ),
        buildDraft(
          `${key}-r3b`,
          step.alternative,
          rules({ knowledge: 0.61, agency: 0.57 }, 8)
        ),
      ],
      round2.feedback
    ),
  ]
}

/** One step of a Turn's progress, as the Turn route streams it. */
export type TurnPhaseStep = {
  phase: "reading" | "resolving" | "writing" | "judging"
  round: number | null
  ms: number
}

/** Writing and judging, once per Round. */
function roundPhases(rounds: readonly Round[]): TurnPhaseStep[] {
  return rounds.flatMap((round): TurnPhaseStep[] => [
    { phase: "writing", round: round.index, ms: 1450 },
    { phase: "judging", round: round.index, ms: 800 },
  ])
}

export type PlannedTurn = {
  turn: Turn
  phases: TurnPhaseStep[]
  /** Characters the Drafter will name in background work. */
  newNpcs: ScriptNpc[]
}

/**
 * Builds the next Turn of a Session from its current state and the Player's
 * input, without saving anything. The last Turn's background work must be
 * settled first (`settleBackground`).
 */
export function planTurn(
  sessionId: string,
  input: string,
  options: { rounds?: RoundsMode; ending?: ForcedEnding | null } = {}
): PlannedTurn {
  const session = getSession(sessionId)
  if (session.ending !== "none")
    throw new StoreError(
      "conflict",
      "This Session has ended. Start a new Session from its World to play again."
    )
  const turns = listTurns(sessionId)
  if (turns.length === 0) {
    throw new StoreError(
      "conflict",
      "This Session has not had its Opening yet. Reload the page to play it, then act."
    )
  }
  const previous = turns.at(-1)
  if (previous?.backgroundStatus === "pending") {
    throw new StoreError(
      "conflict",
      "The last Turn's background work is still running. Wait for it, then try again."
    )
  }
  const { entries, byKey } = liveSessionEntries(sessionId)
  const before = previous?.state ?? initialState(entries)
  const idx = turns.length
  const ending = options.ending ?? null
  const step = ending
    ? ENDING_STEPS[ending]
    : pickStep(input, new Set(turns.map((turn) => turn.passage)), idx)
  const name = playerName(entries)

  // Discovery: Clues and Knowledge the Passage reveals that were not known yet.
  const cluesFound = [...before.cluesFound]
  const knowledgeRevealed: Record<string, string[]> = Object.fromEntries(
    Object.entries(before.knowledgeRevealed).map(([k, v]) => [k, [...v]])
  )
  const discovery: Discovery[] = []
  const required = new Set(
    entries.flatMap((entry) =>
      entry.kind === "decisive_action" ? entry.data.requires : []
    )
  )
  let recovery = 0
  for (const key of step.reveals ?? []) {
    const entry = byKey.get(key)
    if (entry?.kind === "clue" && !cluesFound.includes(entry.id)) {
      cluesFound.push(entry.id)
      if (required.has(entry.id)) recovery += ENGINE_CONFIG.recovery
      discovery.push({
        target: { kind: "clue", entryId: entry.id },
        question: `Did the Draft reveal ${entry.name.replace(/^[A-Z]{1,2}\d+ — /u, "").replace(/^./, (c) => c.toLowerCase())}?`,
        probability: 0.91,
        revealed: true,
      })
    }
    if (
      entry?.kind === "knowledge" &&
      !(knowledgeRevealed[entry.data.characterId] ?? []).includes(entry.id)
    ) {
      knowledgeRevealed[entry.data.characterId] = [
        ...(knowledgeRevealed[entry.data.characterId] ?? []),
        entry.id,
      ]
      discovery.push({
        target: { kind: "knowledge", entryId: entry.id },
        question: `Did the Draft reveal that ${entry.data.fact.replace(/\.$/, "").replace(/^./, (c) => c.toLowerCase())}?`,
        probability: 0.89,
        revealed: true,
      })
    }
  }

  let offScriptCount =
    before.offScriptCount + (step.outcome.offScriptDelta ?? 0)
  let summary = step.outcome.summary
  let deathRoll: Outcome["deathRoll"] = null
  if (ending === "removed") {
    offScriptCount = Math.max(offScriptCount, ENGINE_CONFIG.offScriptThreshold)
    summary = `Off-script count reaches ${offScriptCount}: ${name} is removed from the case.`
  }
  if (ending === "death") {
    const odds =
      ENGINE_CONFIG.deathOddsPerArc[
        Math.min(before.arcIndex, ENGINE_CONFIG.deathOddsPerArc.length - 1)
      ]
    deathRoll = { odds, roll: 0.07, lethal: true }
    summary = `Death roll 0.07 against odds of ${odds.toFixed(2)}: the action is lethal. The story ends in death.`
  }
  const reputationDelta = (step.outcome.reputationDelta ?? 0) + recovery
  const warningsGiven = [
    ...new Set([
      ...before.warningsGiven,
      ...ENGINE_CONFIG.offScriptWarningsAt.filter((at) => at <= offScriptCount),
    ]),
  ]

  const target =
    step.target[0] === "none" ? undefined : byKey.get(step.target[0])
  const location = step.location ? byKey.get(step.location) : undefined
  const after: PlayerState = {
    ...before,
    locationId: location?.id ?? before.locationId,
    cluesFound,
    knowledgeRevealed,
    reputation: clampReputation(before.reputation + reputationDelta),
    offScriptCount,
    warningsGiven,
    ending: ending ?? "none",
  }

  const rounds = roundsFor(
    `${sessionId}-t${idx}`,
    step,
    options.rounds ?? "script",
    idx * 3 + 2,
    { endingTurn: ending !== null }
  )
  const phases: TurnPhaseStep[] = [
    { phase: "reading", round: null, ms: 650 },
    { phase: "resolving", round: null, ms: 250 },
    ...roundPhases(rounds),
  ]
  const spent = (phase: TurnPhaseStep["phase"]) =>
    phases.filter((p) => p.phase === phase).reduce((sum, p) => sum + p.ms, 0)

  const built = buildTurn(sessionId, {
    idx,
    minutes: 0,
    input,
    intent: step.intent,
    target: target
      ? [target.id, target.name, step.target[1]]
      : ["none", "none", step.target[1]],
    classification: step.classification,
    outcome: {
      kind: step.outcome.kind,
      summary,
      reputationDelta,
      offScriptDelta: step.outcome.offScriptDelta ?? 0,
      deathRoll,
      ending: ending ?? "none",
    },
    directive: step.directive,
    passage: step.passage,
    rounds,
    discovery,
    // An ending Turn has no background work: nothing comes after it.
    background: ending ? background() : null,
    state: after,
  })
  const turn: Turn = {
    ...built,
    createdAt: nowIso(),
    log: {
      ...built.log,
      timings: {
        totalMs: phases.reduce((sum, p) => sum + p.ms, 0),
        readingMs: spent("reading"),
        resolvingMs: spent("resolving"),
        writingMs: spent("writing"),
        judgingMs: spent("judging"),
        backgroundMs: ending ? 0 : null,
      },
    },
  }
  return { turn, phases, newNpcs: ending ? [] : (step.newNpcs ?? []) }
}

/**
 * Builds a Session's Opening (Turn 0, spec §9.0) without saving it: the
 * Writer sets the first scene at the start Location, and the Judge rules on
 * it. Nothing is read and no Outcome is resolved, so its only phases are
 * writing and judging. The seed picks which Opening; `rounds` forces extra
 * Rounds like any Turn.
 */
export function planOpening(
  sessionId: string,
  options: { rounds?: RoundsMode } = {}
): PlannedTurn {
  const session = getSession(sessionId)
  if (listTurns(sessionId).length > 0) {
    throw new StoreError(
      "conflict",
      "This Session has already had its Opening. Reload the page to see it."
    )
  }
  const { entries } = liveSessionEntries(sessionId)
  const script = pickOpening(session.seed)
  const rounds = roundsFor(
    `${sessionId}-t${OPENING_IDX}`,
    script,
    options.rounds ?? "script",
    2,
    { opening: true }
  )
  const phases = roundPhases(rounds)
  const spent = (phase: TurnPhaseStep["phase"]) =>
    phases.filter((p) => p.phase === phase).reduce((sum, p) => sum + p.ms, 0)
  const built = buildOpening(sessionId, {
    minutes: 0,
    directive: OPENING_DIRECTIVE,
    passage: script.passage,
    rounds,
    background: null,
    state: initialState(entries),
  })
  const turn: Turn = {
    ...built,
    createdAt: nowIso(),
    log: {
      ...built.log,
      timings: {
        totalMs: phases.reduce((sum, p) => sum + p.ms, 0),
        readingMs: 0,
        resolvingMs: 0,
        writingMs: spent("writing"),
        judgingMs: spent("judging"),
        backgroundMs: null,
      },
    },
  }
  return { turn, phases, newNpcs: [] }
}

declare global {
  var __sandsOpeningsInFlight: WeakMap<object, Set<string>> | undefined
}

/** Sessions whose Opening is being written now, for the current store (kept on `globalThis` like the background jobs). */
function openingsInFlight(): Set<string> {
  globalThis.__sandsOpeningsInFlight ??= new WeakMap()
  const store = getStore()
  let inFlight = globalThis.__sandsOpeningsInFlight.get(store)
  if (!inFlight) {
    inFlight = new Set()
    globalThis.__sandsOpeningsInFlight.set(store, inFlight)
  }
  return inFlight
}

/**
 * Claims the right to write a Session's Opening, so a second tab, a fast
 * reload or a doubled effect cannot write another one alongside it. Throws a
 * conflict when the Session already has Turns or another request holds the
 * claim. Returns the release; call it when the Opening ships, fails or the
 * client goes away (nothing is saved before a Passage ships, so a released
 * claim leaves the Session as it was).
 */
export function claimOpening(sessionId: string): () => void {
  getSession(sessionId)
  if (listTurns(sessionId).length > 0) {
    throw new StoreError(
      "conflict",
      "This Session has already had its Opening. Reload the page to see it."
    )
  }
  const inFlight = openingsInFlight()
  if (inFlight.has(sessionId)) {
    throw new StoreError(
      "conflict",
      "This Session's Opening is already being written, perhaps in another tab. It appears here once it ships."
    )
  }
  inFlight.add(sessionId)
  let released = false
  return () => {
    if (released) return
    released = true
    inFlight.delete(sessionId)
  }
}

/** Saves a planned Turn: the Turn row, the Session's Ending, and its background work (spec §9.1 step 7). */
export function commitTurn(plan: PlannedTurn): {
  turn: Turn
  session: Session
} {
  const store = getStore()
  const session = getSession(plan.turn.sessionId)
  const turns = listTurns(session.id)
  if (turns.length !== plan.turn.idx || session.ending !== "none") {
    throw new StoreError(
      "conflict",
      "Another Turn finished first in this Session. Reload to see it."
    )
  }
  // Written when the Passage ships, not when the Turn was planned.
  const turn = turnSchema.parse({
    ...plan.turn,
    createdAt: nowIso(),
  } satisfies Turn)
  const saved: Session = {
    ...session,
    ending: turn.state.ending,
    updatedAt: turn.createdAt,
  }
  store.turns.set(session.id, [...turns, turn])
  store.sessions.set(session.id, saved)
  if (turn.backgroundStatus === "pending") {
    backgroundJobs().set(turn.id, {
      dueAt: Date.parse(turn.createdAt) + BACKGROUND_MS,
      newNpcs: plan.newNpcs,
    })
  }
  return { turn, session: saved }
}

// Background work (spec §9.2): runs after the Passage ships, merged into the latest Turn when it finishes.

type BackgroundJob = { dueAt: number; newNpcs: ScriptNpc[] }

declare global {
  var __sandsBackgroundJobs:
    WeakMap<object, Map<string, BackgroundJob>> | undefined
}

/**
 * Scheduled background work by Turn id, for the current store. Kept on
 * `globalThis` (each route has its own module graph in dev) and keyed by the
 * store, so a reset store starts with none.
 */
function backgroundJobs(): Map<string, BackgroundJob> {
  globalThis.__sandsBackgroundJobs ??= new WeakMap()
  const store = getStore()
  let jobs = globalThis.__sandsBackgroundJobs.get(store)
  if (!jobs) {
    jobs = new Map()
    globalThis.__sandsBackgroundJobs.set(store, jobs)
  }
  return jobs
}

/** The latest Turn's background work, if it is still running, with the time left. */
export function pendingBackground(
  sessionId: string
): { turnId: string; remainingMs: number } | null {
  const last = listTurns(sessionId).at(-1)
  if (!last || last.backgroundStatus !== "pending") return null
  const jobs = backgroundJobs()
  // Seeded pending work (the mid-play Session's last Turn) starts when first asked about.
  let job = jobs.get(last.id)
  if (!job) {
    job = { dueAt: Date.now() + BACKGROUND_MS, newNpcs: [] }
    jobs.set(last.id, job)
  }
  return { turnId: last.id, remainingMs: Math.max(0, job.dueAt - Date.now()) }
}

function slug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

/** Did the story meet this Exit condition, judging by the Session so far? */
function exitConditionMet(
  key: string | null,
  turns: readonly Turn[],
  keyOf: (id: string) => string | null
): boolean {
  const last = turns.at(-1)
  if (!last) return false
  // Arriving is not visiting: the Opening sets the scene, and the Player has done nothing yet.
  const visited = new Set(
    turns
      .filter((turn) => !isOpening(turn))
      .map((turn) => keyOf(turn.state.locationId))
  )
  const knowledge = new Set(
    Object.values(last.state.knowledgeRevealed).flat().map(keyOf)
  )
  switch (key) {
    case "exit-1":
      return visited.has("yard")
    case "exit-2":
      return (
        knowledge.has("k-amanda") &&
        (visited.has("whitechapel") || visited.has("spitalfields"))
      )
    case "exit-3":
      return last.state.ending === "win"
    default:
      return false
  }
}

function madeProgress(turn: Turn, before: Turn | undefined) {
  if (!before) return true
  const count = (t: Turn) =>
    Object.values(t.state.knowledgeRevealed).flat().length
  return (
    turn.state.cluesFound.length > before.state.cluesFound.length ||
    count(turn) > count(before) ||
    turn.state.arcIndex > before.state.arcIndex
  )
}

/**
 * Finishes the latest Turn's background work if it is due (or at once with
 * `force`): names new NPCs, checks the Arc's Exit conditions and pacing, and
 * merges the results into that Turn's log and state (ADR-0006). Returns the
 * updated Turn and any new Entries, or null when nothing was pending or due.
 */
export function settleBackground(
  sessionId: string,
  options: { force?: boolean } = {}
): { turn: Turn; entries: Entry[] } | null {
  const pending = pendingBackground(sessionId)
  if (!pending || (!options.force && pending.remainingMs > 0)) return null
  const store = getStore()
  const session = getSession(sessionId)
  const turns = listTurns(sessionId)
  const last = turns.at(-1)!
  const job = backgroundJobs().get(last.id)!
  const { entries } = liveSessionEntries(sessionId)
  const now = nowIso()

  // Extraction: named characters not in the Codex become proposed play NPCs.
  const known = new Set(
    listSessionEntries(sessionId).map((entry) => entry.name.toLowerCase())
  )
  const created: Entry[] = []
  for (const npc of job.newNpcs) {
    const id = `${sessionId}.play-${slug(npc.name)}`
    if (known.has(npc.name.toLowerCase()) || store.entries.has(id)) continue
    created.push(
      saveEntry({
        id,
        worldId: session.worldId,
        sessionId,
        templateId: null,
        kind: "npc",
        name: npc.name,
        description: npc.description,
        keyFacts: [],
        data: {
          role: npc.role,
          age: "",
          personality: npc.personality,
          backstory: npc.backstory,
          isPlayer: false,
          hiddenFields: [],
          aliases: [],
        },
        source: "play",
        sourceTurn: last.idx,
        status: "proposed",
        jevFlags: [],
        seenAt: null,
        createdAt: now,
        updatedAt: now,
      })
    )
  }

  // Arc check: every Exit condition of the current Arc.
  const keyById = new Map(
    entries.map((entry) => [entry.id, templateKey(entry)])
  )
  const keyOf = (id: string) => keyById.get(id) ?? null
  const exits = entries.filter(
    (entry) =>
      entry.kind === "exit_condition" &&
      entry.data.arcIndex === last.state.arcIndex
  )
  const arcCheck = exits.map((entry) => {
    const met = exitConditionMet(templateKey(entry), turns, keyOf)
    return { exitConditionId: entry.id, probability: met ? 0.88 : 0.23, met }
  })
  const arcCount = getWorld(session.worldId).brief?.arcs.length ?? 1
  const arcAdvancedTo =
    arcCheck.length > 0 &&
    arcCheck.every((check) => check.met) &&
    last.state.arcIndex < arcCount - 1
      ? last.state.arcIndex + 1
      : null

  // Pacing: no progress over the last few Turns sets a nudge for the next Directive.
  const window = turns.slice(-ENGINE_CONFIG.pacingWindow)
  const stalled =
    turns.length >= ENGINE_CONFIG.pacingWindow &&
    window.every((turn) => !madeProgress(turn, turns[turn.idx - 1])) &&
    arcAdvancedTo === null
  const arcName =
    getWorld(session.worldId).brief?.arcs[last.state.arcIndex]?.name ??
    `Arc ${last.state.arcIndex + 1}`
  const reason = stalled
    ? `No progress toward the ${arcName} Arc's Exit conditions in the last ${ENGINE_CONFIG.pacingWindow} Turns.`
    : null

  const results: BackgroundResults = background({
    newEntryIds: created.map((entry) => entry.id),
    arcCheck,
    arcAdvancedTo,
    pacing: { probability: stalled ? 0.27 : 0.81, nudge: stalled, reason },
  })
  const turn = turnSchema.parse({
    ...last,
    backgroundStatus: "done",
    log: {
      ...last.log,
      background: results,
      timings: {
        ...last.log.timings,
        backgroundMs: Math.max(0, Date.now() - Date.parse(last.createdAt)),
      },
    },
    state: {
      ...last.state,
      arcIndex: arcAdvancedTo ?? last.state.arcIndex,
      pacingNudge: { active: stalled, reason },
    },
  } satisfies Turn)
  store.turns.set(sessionId, [...turns.slice(0, -1), turn])
  backgroundJobs().delete(last.id)
  return { turn, entries: created }
}
