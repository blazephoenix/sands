/**
 * PROTOTYPE, throwaway (issue #36): a Skeleton as BlockNote blocks, in two
 * layouts. "tables" follows the #24 template (fields as `Label: value` lines,
 * row sections as native tables, cards for characters and Arcs); "cards"
 * makes every row a card of `Label: value` lines.
 */
import type { Skeleton } from "@/domain/skeleton"
import { toSegments } from "@/skeleton/hidden-text"

type Inline = { type: "text"; text: string; styles: Record<string, boolean> }
// Loose on purpose: the prototype hands these straight to BlockNote.
export type ProtoBlock = {
  id?: string
  type: string
  props?: Record<string, unknown>
  content?: unknown
}

export type Layout = "tables" | "cards"

export type ProtoSection = {
  id: string
  title: string
  /** Rows, for the outline's count; null for a section of fields. */
  count: number | null
  blocks: ProtoBlock[]
}

function inline(value: string): Inline[] {
  return toSegments(value).map((segment): Inline => ({
    type: "text",
    text: segment.text,
    styles: segment.hidden ? { hidden: true } : {},
  }))
}

function field(label: string, value: string): ProtoBlock {
  return {
    type: "paragraph",
    content: [
      { type: "text", text: `${label}: `, styles: { bold: true } },
      ...inline(value),
    ],
  }
}

function heading(text: string, level: 2 | 3 | 4, id?: string): ProtoBlock {
  return { id, type: "heading", props: { level }, content: inline(text) }
}

function table(headers: string[], rows: string[][]): ProtoBlock {
  return {
    type: "table",
    content: {
      type: "tableContent",
      headerRows: 1,
      rows: [
        { cells: headers.map((h) => [{ type: "text", text: h, styles: {} }]) },
        ...rows.map((row) => ({ cells: row.map(inline) })),
      ],
    },
  }
}

type Columns<T> = [label: string, value: (row: T) => string][]

/** One row section: a table, or a card per row. */
function rowSection<T>(
  layout: Layout,
  rows: readonly T[],
  columns: Columns<T>,
  cardTitle: (row: T, index: number) => string
): ProtoBlock[] {
  if (layout === "tables")
    return [
      table(
        columns.map(([label]) => label),
        rows.map((row) => columns.map(([, value]) => value(row)))
      ),
    ]
  return rows.flatMap((row, index) => [
    heading(cardTitle(row, index), 3),
    ...columns.slice(1).map(([label, value]) => field(label, value(row))),
  ])
}

export function skeletonSections(
  skeleton: Skeleton,
  layout: Layout
): ProtoSection[] {
  const { story, playSettings, voiceAndCanon } = skeleton
  const section = (
    id: string,
    title: string,
    count: number | null,
    blocks: ProtoBlock[]
  ): ProtoSection => ({
    id,
    title,
    count,
    blocks: [heading(title, 2, `sec-${id}`), ...blocks],
  })
  return [
    section("story", "Story", null, [
      field("Title", story.title),
      field("Premise", story.premise),
      field("Genre", story.genre),
      field("Theme", story.theme),
      field("Setting", story.setting),
      field("Period", story.period),
      field("Based on", story.basedOn),
    ]),
    section("play", "Play settings", null, [
      field("Player character", playSettings.playerCharacter),
      field("Point of view", playSettings.pointOfView),
      field("Opening", playSettings.opening),
      field("Offscreen scenes", playSettings.offscreenScenes),
      field("Claims", playSettings.claims),
    ]),
    section(
      "characters",
      "Characters",
      skeleton.characters.length,
      skeleton.characters.flatMap((c) => [
        heading(c.name, 3),
        field("Aliases", c.aliases),
        field("Role", c.role),
        field("Core", c.core),
        field("Want", c.want),
        field("Want priority", c.wantPriority),
        field("Fear or weakness", c.fearOrWeakness),
        field("Lines", c.lines),
        field("Speech", c.speech),
        field("Knows", c.knows),
        field("Believes", c.believes),
        ...(layout === "tables"
          ? [
              table(
                ["Tie toward", "Wants from them", "Friction", "Starts as"],
                c.ties.map((t) => [t.toward, t.wants, t.friction, t.startsAs])
              ),
            ]
          : c.ties.flatMap((t) => [
              heading(`Tie toward ${t.toward}`, 4),
              field("Wants from them", t.wants),
              field("Friction", t.friction),
              field("Starts as", t.startsAs),
            ])),
      ])
    ),
    section(
      "places",
      "Places",
      skeleton.places.length,
      rowSection(
        layout,
        skeleton.places,
        [
          ["Name", (p) => p.name],
          ["Description", (p) => p.description],
          ["Connects to", (p) => p.connectsTo],
          ["What happens here", (p) => p.whatHappensHere],
        ],
        (p) => p.name
      )
    ),
    section(
      "rules",
      "World rules",
      skeleton.worldRules.length,
      rowSection(
        layout,
        skeleton.worldRules,
        [
          ["Rule", (r) => r.rule],
          ["What it allows", (r) => r.allows],
          ["Cost or limit", (r) => r.costOrLimit],
          ["What it cannot do", (r) => r.cannotDo],
          ["Exceptions", (r) => r.exceptions],
        ],
        (r) => r.rule
      )
    ),
    section(
      "promises",
      "Promises",
      skeleton.promises.length,
      rowSection(
        layout,
        skeleton.promises,
        [
          ["Promise", (p) => p.promise],
          ["Setup", (p) => p.setup],
          ["Payoff", (p) => p.payoff],
          ["Earliest Arc", (p) => p.earliestArc],
        ],
        (p) => p.promise
      )
    ),
    section(
      "arcs",
      "Arcs",
      skeleton.arcs.length,
      skeleton.arcs.flatMap((a) => [
        heading(a.name, 3),
        field("Description", a.description),
        field("Function", a.function),
        field("Set pieces", a.setPieces),
        field("Must-land moments", a.mustLandMoments),
        field("Stakes", a.stakes),
        field("If landed early", a.ifLandedEarly),
        ...(layout === "tables"
          ? [
              table(
                [
                  "Agenda for",
                  "Want this Arc",
                  "Steps, in order",
                  "If blocked",
                ],
                a.agendas.map((g) => [
                  g.character,
                  g.want,
                  g.steps,
                  g.ifBlocked,
                ])
              ),
            ]
          : a.agendas.flatMap((g) => [
              heading(`Agenda for ${g.character}`, 4),
              field("Want this Arc", g.want),
              field("Steps, in order", g.steps),
              field("If blocked", g.ifBlocked),
            ])),
      ])
    ),
    section(
      "secrets",
      "Hidden truth",
      skeleton.secrets.length,
      rowSection(
        layout,
        skeleton.secrets,
        [
          ["Secret", (s) => s.secret],
          ["Who knows", (s) => s.whoKnows],
          ["How it surfaces", (s) => s.howItSurfaces],
          ["Earliest Arc", (s) => s.earliestArc],
          ["What the Player can do with it", (s) => s.whatPlayerCanDo],
        ],
        (_, index) => `Secret ${index + 1}`
      )
    ),
    section("endings", "Endings", skeleton.endings.length, [
      ...rowSection(
        layout,
        skeleton.endings,
        [
          ["Ending", (e) => e.name],
          ["Kind", (e) => e.kind],
          ["Trigger", (e) => e.trigger],
          ["Earliest Arc", (e) => e.earliestArc],
        ],
        (e) => e.name
      ),
      field(
        "Writer may invent endings",
        skeleton.writerMayInventEndings ? "Yes" : "No"
      ),
    ]),
    section(
      "flags",
      "State flags",
      skeleton.stateFlags.length,
      rowSection(
        layout,
        skeleton.stateFlags,
        [
          ["Flag", (f) => f.flag],
          ["Values", (f) => f.values],
          ["Epilogue line per value", (f) => f.epilogue],
        ],
        (f) => f.flag
      )
    ),
    section("voice", "Voice and canon", null, [
      field("Voice", voiceAndCanon.voice),
      field("Sample passage", voiceAndCanon.samplePassage),
      field("Fixed facts", voiceAndCanon.fixedFacts),
      field("Writer may invent", voiceAndCanon.writerMayInvent),
      field("Writer must not invent", voiceAndCanon.writerMustNotInvent),
      field("Pacing", voiceAndCanon.pacing),
      field("Never", voiceAndCanon.never),
    ]),
  ]
}
