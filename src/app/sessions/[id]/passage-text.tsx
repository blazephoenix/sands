"use client"

/**
 * A Passage's paragraphs, with preview cards on what the reader may want to
 * look up, the way Wikipedia previews a link: rest on a character's name for
 * who they are and what the Player character knows of them by then; rest on
 * a dotted word for its meaning in this story.
 *
 * A name matches by the character's full name, an alias, or a first or last
 * name no other character shares. A name that is a title ("The Wicked Witch
 * of the West") matches only whole: its words alone would catch other people
 * ("the Witch of the North"). One-word names match in their own case
 * ("Royce", not "royce"); longer names and defined words in any case.
 */
import * as React from "react"

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import type { CharacterKnowledge, GlossaryTerm } from "@/domain/session"
import type { Character, Skeleton } from "@/domain/skeleton"
import { passageParagraphs } from "@/lib/passage"
import { plainText, toSegments } from "@/skeleton/hidden-text"

type Target =
  | { kind: "character"; character: Character; name: string }
  | { kind: "term"; term: GlossaryTerm }

type Matcher = { text: string; exactCase: boolean; target: Target }

/** A field with its Hidden text left out: what a Player may see. */
function visible(value: string) {
  return toSegments(value)
    .filter((segment) => !segment.hidden)
    .map((segment) => segment.text)
    .join("")
    .replace(/[ \t]+\n/g, "\n")
    .trim()
}

function escape(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** "The Scarecrow", "Witch of the West": a description, not a given name. */
function isTitle(name: string) {
  const words = name.split(/\s+/)
  return /^the$/i.test(words[0]) || words.some((word) => /^\p{Ll}/u.test(word))
}

function characterMatchers(skeleton: Skeleton): Matcher[] {
  const out: Matcher[] = []
  const parts = new Map<string, number>()
  const named = skeleton.characters
    .map((character) => ({ character, name: visible(character.name) }))
    .filter(({ name }) => name)
  for (const { name } of named)
    for (const part of name.split(/\s+/))
      parts.set(part, (parts.get(part) ?? 0) + 1)

  for (const { character, name } of named) {
    const target: Target = { kind: "character", character, name }
    const texts = new Set([name])
    for (const alias of visible(character.aliases).split(/[;,\n]/))
      if (alias.trim()) texts.add(alias.trim())
    if (!isTitle(name))
      for (const part of name.split(/\s+/))
        if (part.length >= 3 && /^\p{Lu}/u.test(part) && parts.get(part) === 1)
          texts.add(part)
    for (const text of texts)
      out.push({ text, exactCase: !/\s/.test(text), target })
  }
  return out
}

/** Finds names and words in Passages. Build once per Session view. */
export function usePassageMatchers(
  skeleton: Skeleton,
  glossary: readonly GlossaryTerm[]
) {
  return React.useMemo(() => {
    const matchers = [
      ...characterMatchers(skeleton),
      ...glossary.map((term): Matcher => ({
        text: term.term,
        exactCase: false,
        target: { kind: "term", term },
      })),
    ]
    // Longest first, so "Danny Royce" wins over "Danny".
    matchers.sort((a, b) => b.text.length - a.text.length)
    const byKey = new Map<string, Matcher[]>()
    for (const m of matchers) {
      const key = m.text.toLowerCase()
      byKey.set(key, [...(byKey.get(key) ?? []), m])
    }
    const pattern =
      matchers.length > 0
        ? new RegExp(
            `(?<![\\p{L}\\p{N}])(${matchers.map((m) => escape(m.text)).join("|")})(?![\\p{L}\\p{N}])`,
            "giu"
          )
        : null
    return { pattern, byKey }
  }, [skeleton, glossary])
}

export type PassageMatchers = ReturnType<typeof usePassageMatchers>

function annotate(
  text: string,
  { pattern, byKey }: PassageMatchers,
  known: readonly CharacterKnowledge[]
): React.ReactNode[] {
  if (!pattern) return [text]
  const out: React.ReactNode[] = []
  let last = 0
  for (const match of text.matchAll(pattern)) {
    const found = match[0]
    const candidates = byKey.get(found.toLowerCase()) ?? []
    const matcher = candidates.find((m) => !m.exactCase || m.text === found)
    if (!matcher) continue
    out.push(text.slice(last, match.index))
    out.push(
      <Preview key={match.index} target={matcher.target} known={known}>
        {found}
      </Preview>
    )
    last = match.index + found.length
  }
  out.push(text.slice(last))
  return out
}

/** A Passage as paragraphs, names and defined words carrying preview cards. */
export function PassageText({
  passage,
  matchers,
  known,
}: {
  passage: string
  matchers: PassageMatchers
  /** What the Player character knew of each character as of this Passage. */
  known: readonly CharacterKnowledge[]
}) {
  return passageParagraphs(passage).map((paragraph, index) => (
    <p key={index} className="not-first:mt-4">
      {annotate(paragraph, matchers, known)}
    </p>
  ))
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter((part) => /^\p{L}/u.test(part))
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("")
}

function Preview({
  target,
  known,
  children,
}: {
  target: Target
  known: readonly CharacterKnowledge[]
  children: React.ReactNode
}) {
  return (
    <HoverCard>
      <HoverCardTrigger
        delay={500}
        render={<span tabIndex={0} />}
        className="cursor-help rounded-sm underline decoration-muted-foreground/50 decoration-dotted underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {children}
      </HoverCardTrigger>
      <HoverCardContent
        side="top"
        className="w-80 p-4 text-left text-sm leading-relaxed"
      >
        {target.kind === "term" ? (
          <TermCard term={target.term} />
        ) : (
          <CharacterCard
            character={target.character}
            name={target.name}
            knows={
              known.find((k) => plainText(k.character) === target.name)
                ?.knows ?? null
            }
          />
        )}
      </HoverCardContent>
    </HoverCard>
  )
}

function TermCard({ term }: { term: GlossaryTerm }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="font-medium">{term.term}</p>
      <p className="text-muted-foreground">{term.definition}</p>
    </div>
  )
}

function CharacterCard({
  character,
  name,
  knows,
}: {
  character: Character
  name: string
  knows: string | null
}) {
  const role = visible(character.role)
  const core = visible(character.core)
  const speech = visible(character.speech)
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted font-medium text-muted-foreground"
        >
          {initials(name)}
        </span>
        <div className="min-w-0">
          <p className="font-medium">{name}</p>
          {role ? <p className="text-muted-foreground">{role}</p> : null}
        </div>
      </div>
      {core ? <p>{core}</p> : null}
      {speech ? <p className="text-muted-foreground italic">{speech}</p> : null}
      <div className="flex flex-col gap-1 border-t pt-3">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          What you know
        </p>
        <p>{knows ?? "Nothing yet beyond what you see."}</p>
      </div>
    </div>
  )
}
