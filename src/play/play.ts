/**
 * Playing a Session: starting one (its Opening) and playing a Turn. The
 * Writer writes every Passage from the Skeleton alone; code only stores what
 * it wrote and ends the Session when the Writer names an Ending the Skeleton
 * allows.
 *
 * The Writer is called before anything is stored, so a failed call leaves no
 * Session or Turn behind, and the Player's input is kept for a retry.
 */
import type { Db } from "@/db/client"
import { StoreError } from "@/db/errors"
import {
  endSession,
  getSession,
  insertSession,
  insertTurn,
  listTurns,
  touchSession,
} from "@/db/sessions"
import { getWorld } from "@/db/worlds"
import type {
  CharacterKnowledge,
  GlossaryTerm,
  ReachedEnding,
  Session,
  Turn,
} from "@/domain/session"
import type { EndingKind, Skeleton } from "@/domain/skeleton"
import { newId } from "@/lib/ids"
import { nowIso } from "@/lib/time"
import type { Writer, WriterOutput, WriterResult } from "@/models/writer"
import { checkSkeleton, nameKey } from "@/skeleton/check"
import { plainText } from "@/skeleton/hidden-text"

import { writerRequest } from "./writer-prompt"

const MAX_CHOICES = 4

/**
 * The Ending a reply reached, if code accepts it: a listed Ending by name
 * (its Kind is the Skeleton's, whatever the Writer said), or an invented one
 * when the Skeleton allows that. Anything else is noted and play goes on.
 */
export function resolveEnding(
  skeleton: Skeleton,
  named: WriterOutput["ending"]
): { ending: ReachedEnding | null; notes: string[] } {
  if (!named || !named.name.trim()) return { ending: null, notes: [] }
  const listed = skeleton.endings.find(
    (ending) => nameKey(ending.name) === nameKey(named.name)
  )
  if (listed) {
    return {
      ending: {
        name: plainText(listed.name).trim(),
        kind: nameKey(listed.kind) as EndingKind,
        invented: false,
      },
      notes:
        nameKey(listed.kind) === named.kind
          ? []
          : [
              `The Writer called this Ending ${named.kind}; the Skeleton lists it as ${nameKey(listed.kind)}, which is what was recorded.`,
            ],
    }
  }
  if (skeleton.writerMayInventEndings) {
    return {
      ending: { name: named.name.trim(), kind: named.kind, invented: true },
      notes: [`The Writer invented this Ending: “${named.name.trim()}”.`],
    }
  }
  return {
    ending: null,
    notes: [
      `The Writer ended on “${named.name.trim()}”, which the Skeleton doesn't list, and it may not invent Endings, so the Session goes on.`,
    ],
  }
}

/** Trimmed, distinct, non-empty choices, at most four; none once the Session has ended. */
export function cleanChoices(choices: readonly string[], ended: boolean) {
  if (ended) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const choice of choices) {
    const text = choice.trim()
    const key = text.toLowerCase()
    if (!text || seen.has(key)) continue
    seen.add(key)
    out.push(text)
  }
  return out.slice(0, MAX_CHOICES)
}

/**
 * The Player character's knowledge of each character after a Passage: the
 * last Turn's, with the Writer's new notes replacing a character's entry.
 * Notes are matched to the Skeleton's characters by name or alias; a note on
 * anyone else is dropped, and logged.
 */
export function mergeKnowledge(
  skeleton: Skeleton,
  previous: readonly CharacterKnowledge[],
  notes: WriterOutput["characterNotes"]
): { known: CharacterKnowledge[]; log: string[] } {
  const byName = new Map<string, string>()
  for (const character of skeleton.characters) {
    const name = plainText(character.name).trim()
    if (!name) continue
    for (const alias of [name, ...plainText(character.aliases).split(/[;,\n]/)])
      if (alias.trim()) byName.set(nameKey(alias), name)
  }
  const known = [...previous]
  const log: string[] = []
  for (const note of notes) {
    const name = byName.get(nameKey(note.character))
    const knows = note.knows.trim()
    if (!name) {
      log.push(
        `The Writer noted “${note.character.trim()}”, who isn't a Skeleton character, so the note was dropped.`
      )
      continue
    }
    if (!knows) continue
    const at = known.findIndex((k) => k.character === name)
    if (at === -1) known.push({ character: name, knows })
    else known[at] = { character: name, knows }
  }
  return { known, log }
}

/** New words the Passage really uses, each defined once per Session. */
export function cleanGlossary(
  passage: string,
  previous: readonly Turn[],
  glossary: WriterOutput["glossary"]
): GlossaryTerm[] {
  const seen = new Set(
    previous.flatMap((turn) => turn.glossary.map((g) => g.term.toLowerCase()))
  )
  const text = passage.toLowerCase()
  const out: GlossaryTerm[] = []
  for (const entry of glossary) {
    const term = entry.term.trim()
    const definition = entry.definition.trim()
    const key = term.toLowerCase()
    if (!term || !definition || seen.has(key) || !text.includes(key)) continue
    seen.add(key)
    out.push({ term, definition })
  }
  return out
}

function turnFrom(
  sessionId: string,
  previous: readonly Turn[],
  playerInput: string | null,
  request: { instructions: string; prompt: string },
  result: WriterResult,
  skeleton: Skeleton
): Turn {
  const { ending, notes } = resolveEnding(skeleton, result.output.ending)
  const passage = result.output.passage.trim()
  const knowledge = mergeKnowledge(
    skeleton,
    previous.at(-1)?.known ?? [],
    result.output.characterNotes
  )
  return {
    id: newId("t"),
    sessionId,
    index: previous.length,
    playerInput,
    passage,
    choices: cleanChoices(result.output.choices, ending !== null),
    ending,
    known: knowledge.known,
    glossary: cleanGlossary(passage, previous, result.output.glossary),
    log: {
      instructions: request.instructions,
      prompt: request.prompt,
      rawOutput: result.rawOutput,
      model: result.model,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      latencyMs: result.latencyMs,
      notes: [...notes, ...knowledge.log],
    },
    createdAt: nowIso(),
  }
}

/**
 * Starts a Session in a World: freezes its Skeleton, has the Writer write the
 * Opening, and stores both. Refused while the Skeleton has issues that block
 * play.
 */
export async function startSession(
  db: Db,
  writer: Writer,
  worldId: string,
  options: { signal?: AbortSignal } = {}
): Promise<{ session: Session; turns: Turn[] }> {
  const world = await getWorld(db, worldId)
  const blocking = checkSkeleton(world.skeleton).filter((i) => i.blocksPlay)
  if (blocking.length > 0) {
    throw new StoreError(
      "conflict",
      `This World can't be played yet. ${blocking
        .slice(0, 3)
        .map((issue) => issue.message)
        .join(" ")}`
    )
  }
  const sessionId = newId("s")
  const request = writerRequest(world.skeleton, [], null)
  const result = await writer.write(request, options)
  const opening = turnFrom(sessionId, [], null, request, result, world.skeleton)
  const now = nowIso()
  const session: Session = {
    id: sessionId,
    worldId: world.id,
    skeleton: world.skeleton,
    ending: opening.ending,
    createdAt: now,
    updatedAt: now,
  }
  await db.transaction(async (tx) => {
    await insertSession(tx, session)
    await insertTurn(tx, opening)
  })
  return { session, turns: [opening] }
}

/** Plays one Turn: the Player's input, the Writer's Passage, and the Ending it reached, if any. */
export async function playTurn(
  db: Db,
  writer: Writer,
  sessionId: string,
  input: string,
  options: { signal?: AbortSignal } = {}
): Promise<{ session: Session; turn: Turn }> {
  const playerInput = input.trim()
  if (!playerInput)
    throw new StoreError("invalid", "Write what the Player character does.")
  const session = await getSession(db, sessionId)
  if (session.ending)
    throw new StoreError(
      "conflict",
      "This Session has ended. Start a new Session to play again."
    )
  const turns = await listTurns(db, sessionId)
  const request = writerRequest(session.skeleton, turns, playerInput)
  const result = await writer.write(request, options)
  const turn = turnFrom(
    sessionId,
    turns,
    playerInput,
    request,
    result,
    session.skeleton
  )
  const next: Session = {
    ...session,
    ending: turn.ending,
    updatedAt: turn.createdAt,
  }
  await db.transaction(async (tx) => {
    await insertTurn(tx, turn)
    if (turn.ending) await endSession(tx, next, turn.createdAt)
    else await touchSession(tx, sessionId, turn.createdAt)
  })
  return { session: next, turn }
}
