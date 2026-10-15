/**
 * The Skeleton as the Writer reads it: Markdown in the editor's section
 * order, with the editor's labels. Blank fields and empty sections are left
 * out, since they tell the Writer nothing. Hidden text keeps its
 * `<hidden>…</hidden>` tags; the Writer's instructions say what they mean.
 */
import type { Skeleton } from "@/domain/skeleton"

import { isBlank } from "./check"

type Field = readonly [label: string, value: string]

function fields(list: readonly Field[]) {
  return list
    .filter(([, value]) => !isBlank(value))
    .map(([label, value]) =>
      value.includes("\n")
        ? `- **${label}:**\n${indent(value)}`
        : `- **${label}:** ${value}`
    )
    .join("\n")
}

function indent(value: string) {
  return value
    .split("\n")
    .map((line) => `  ${line}`)
    .join("\n")
}

function section(title: string, body: string) {
  return body.trim() ? `## ${title}\n\n${body.trim()}` : ""
}

function rows<T>(
  items: readonly T[],
  heading: (item: T, index: number) => string,
  toFields: (item: T) => readonly Field[]
) {
  return items
    .map((item, index) => {
      const body = fields(toFields(item))
      return `### ${heading(item, index)}${body ? `\n\n${body}` : ""}`
    })
    .join("\n\n")
}

export function skeletonToPrompt(skeleton: Skeleton): string {
  const { story, playSettings, voiceAndCanon } = skeleton
  const parts = [
    section(
      "Story",
      fields([
        ["Title", story.title],
        ["Premise", story.premise],
        ["Genre", story.genre],
        ["Theme", story.theme],
        ["Setting", story.setting],
        ["Period", story.period],
        ["Based on", story.basedOn],
      ])
    ),
    section(
      "Play settings",
      fields([
        ["Player character", playSettings.playerCharacter],
        ["Point of view", playSettings.pointOfView],
        ["Opening", playSettings.opening],
        ["Offscreen scenes", playSettings.offscreenScenes],
        ["Claims", playSettings.claims],
      ])
    ),
    section(
      "Characters",
      rows(
        skeleton.characters,
        (c) => `Character: ${c.name}`,
        (c) => [
          ["Aliases", c.aliases],
          ["Role", c.role],
          ["Core", c.core],
          ["Want", c.want],
          ["Want priority", c.wantPriority],
          ["Fear or weakness", c.fearOrWeakness],
          ["Lines", c.lines],
          ["Speech", c.speech],
          ["Knows", c.knows],
          ["Believes", c.believes],
          ...c.ties.map((tie): Field => [
            `Tie toward ${tie.toward}`,
            [
              tie.wants && `Wants: ${tie.wants}`,
              tie.friction && `Friction: ${tie.friction}`,
              tie.startsAs && `Starts as: ${tie.startsAs}`,
            ]
              .filter(Boolean)
              .join("\n"),
          ]),
        ]
      )
    ),
    section(
      "Places",
      rows(
        skeleton.places,
        (p) => `Place: ${p.name}`,
        (p) => [
          ["Description", p.description],
          ["Connects to", p.connectsTo],
          ["What happens here", p.whatHappensHere],
        ]
      )
    ),
    section(
      "World rules",
      rows(
        skeleton.worldRules,
        (r) => `World rule: ${r.rule}`,
        (r) => [
          ["What it allows", r.allows],
          ["Cost or limit", r.costOrLimit],
          ["What it cannot do", r.cannotDo],
          ["Exceptions", r.exceptions],
        ]
      )
    ),
    section(
      "Promises",
      rows(
        skeleton.promises,
        (p) => `Promise: ${p.promise}`,
        (p) => [
          ["Setup", p.setup],
          ["Payoff", p.payoff],
          ["Earliest Arc", p.earliestArc],
        ]
      )
    ),
    section(
      "Arcs, in story order",
      rows(
        skeleton.arcs,
        (a, index) => `Arc ${index + 1}: ${a.name}`,
        (a) => [
          ["Description", a.description],
          ["Function", a.function],
          ["Set pieces", a.setPieces],
          ["Must-land moments", a.mustLandMoments],
          ["Stakes", a.stakes],
          ["If landed early", a.ifLandedEarly],
          ...a.agendas.map((agenda): Field => [
            `Agenda for ${agenda.character}`,
            [
              agenda.want && `Want this Arc: ${agenda.want}`,
              agenda.steps && `Steps, in order:\n${indent(agenda.steps)}`,
              agenda.ifBlocked && `If blocked: ${agenda.ifBlocked}`,
            ]
              .filter(Boolean)
              .join("\n"),
          ]),
        ]
      )
    ),
    section(
      "Hidden truth",
      rows(
        skeleton.secrets,
        (_, index) => `Secret ${index + 1}`,
        (s) => [
          ["Secret", s.secret],
          ["Who knows", s.whoKnows],
          ["How it surfaces", s.howItSurfaces],
          ["Earliest Arc", s.earliestArc],
          ["What the Player can do with it", s.whatPlayerCanDo],
        ]
      )
    ),
    section(
      "Endings",
      [
        rows(
          skeleton.endings,
          (e) => `Ending: ${e.name}`,
          (e) => [
            ["Kind", e.kind],
            ["Trigger", e.trigger],
            ["Earliest Arc", e.earliestArc],
          ]
        ),
        `Writer may invent endings: ${skeleton.writerMayInventEndings ? "Yes" : "No"}`,
      ].join("\n\n")
    ),
    section(
      "State flags",
      rows(
        skeleton.stateFlags,
        (f) => `State flag: ${f.flag}`,
        (f) => [
          ["Values", f.values],
          ["Epilogue line per value", f.epilogue],
        ]
      )
    ),
    section(
      "Voice and canon",
      fields([
        ["Voice", voiceAndCanon.voice],
        ["Sample passage", voiceAndCanon.samplePassage],
        ["Fixed facts", voiceAndCanon.fixedFacts],
        ["Writer may invent", voiceAndCanon.writerMayInvent],
        ["Writer must not invent", voiceAndCanon.writerMustNotInvent],
        ["Pacing", voiceAndCanon.pacing],
        ["Never", voiceAndCanon.never],
      ])
    ),
  ]
  return parts.filter(Boolean).join("\n\n")
}
