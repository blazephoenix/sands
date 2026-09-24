/**
 * Sessions and Turns in the database (spec §6 `sessions`, `turns`; ADR-0006,
 * ADR-0014).
 *
 * A Turn row is written only when a Passage ships. `(session_id, idx)` is
 * unique, so a second Opening (or any second Turn N) for one Session is
 * refused by the database itself, whichever request gets there second.
 */
import { and, asc, count, desc, eq } from "drizzle-orm"

import type { SessionSummary } from "@/domain/api"
import {
  sessionSchema,
  turnSchema,
  type Session,
  type Turn,
} from "@/domain/session"
import type { GetSessionResponse } from "@/domain/session-view"

import type { Db } from "./client"
import { listSessionEntries } from "./entries"
import { StoreError } from "./errors"
import { sessions, turns, type SessionRow, type TurnRow } from "./schema"
import { getWorld } from "./worlds"

export function sessionFromRow(row: SessionRow): Session {
  return sessionSchema.parse(row satisfies Session)
}

export function turnFromRow(row: TurnRow): Turn {
  return turnSchema.parse({
    id: row.id,
    sessionId: row.sessionId,
    idx: row.idx,
    playerInput: row.playerInput,
    passage: row.passage,
    flagged: row.flagged,
    log: row.logJson,
    state: row.stateJson,
    backgroundStatus: row.backgroundStatus,
    createdAt: row.createdAt,
  } satisfies Turn)
}

function turnToRow(turn: Turn): TurnRow {
  const parsed = turnSchema.parse(turn)
  return {
    id: parsed.id,
    sessionId: parsed.sessionId,
    idx: parsed.idx,
    playerInput: parsed.playerInput,
    passage: parsed.passage,
    flagged: parsed.flagged,
    logJson: parsed.log,
    stateJson: parsed.state,
    backgroundStatus: parsed.backgroundStatus,
    createdAt: parsed.createdAt,
  }
}

/** The SQLite error code behind a failed query (drizzle wraps the driver's error). */
export function sqliteErrorCode(error: unknown): string | null {
  for (let e = error; e instanceof Error; e = e.cause) {
    const code = (e as { code?: unknown }).code
    if (typeof code === "string" && code.startsWith("SQLITE_")) return code
  }
  return null
}

export function getSession(db: Db, id: string): Session {
  const row = db.select().from(sessions).where(eq(sessions.id, id)).get()
  if (!row)
    throw new StoreError(
      "not_found",
      `There is no Session "${id}". Start a new one from its World.`
    )
  return sessionFromRow(row)
}

export function insertSession(db: Db, session: Session): Session {
  db.insert(sessions).values(sessionSchema.parse(session)).run()
  return getSession(db, session.id)
}

/** A Session's Turns, oldest first. */
export function listTurns(db: Db, sessionId: string): Turn[] {
  return db
    .select()
    .from(turns)
    .where(eq(turns.sessionId, sessionId))
    .orderBy(asc(turns.idx))
    .all()
    .map(turnFromRow)
}

export function countTurns(db: Db, sessionId: string): number {
  return (
    db
      .select({ n: count() })
      .from(turns)
      .where(eq(turns.sessionId, sessionId))
      .get()?.n ?? 0
  )
}

/**
 * Saves a shipped Turn and the Session's Ending with it (spec §9.1 step 7).
 * Refuses, with a conflict, a Turn for a Session that has ended or a Turn
 * whose index is not the next one; the unique `(session_id, idx)` refuses a
 * Turn another writer saved first.
 */
export function insertTurn(
  db: Db,
  turn: Turn
): { turn: Turn; session: Session } {
  const row = turnToRow(turn)
  const raced = new StoreError(
    "conflict",
    turn.idx === 0
      ? "This Session has already had its Opening. Reload the page to see it."
      : "Another Turn finished first in this Session. Reload to see it."
  )
  try {
    return db.transaction((tx) => {
      const session = getSession(tx, turn.sessionId)
      if (session.ending !== "none") {
        throw new StoreError(
          "conflict",
          "This Session has ended. Start a new Session from its World to play again."
        )
      }
      if (countTurns(tx, session.id) !== turn.idx) throw raced
      tx.insert(turns).values(row).run()
      tx.update(sessions)
        .set({ ending: turn.state.ending, updatedAt: turn.createdAt })
        .where(eq(sessions.id, session.id))
        .run()
      return {
        turn: turnFromRow(row),
        session: getSession(tx, session.id),
      }
    })
  } catch (error) {
    if (sqliteErrorCode(error) === "SQLITE_CONSTRAINT_UNIQUE") throw raced
    throw error
  }
}

/** Replaces a stored Turn (same id), e.g. to merge background results into it (ADR-0006). */
export function updateTurn(db: Db, turn: Turn): Turn {
  const { id, sessionId, idx, ...row } = turnToRow(turn)
  const result = db
    .update(turns)
    .set(row)
    .where(
      and(eq(turns.id, id), eq(turns.sessionId, sessionId), eq(turns.idx, idx))
    )
    .run()
  if (result.changes === 0)
    throw new StoreError(
      "not_found",
      `There is no Turn ${idx} "${id}" in Session "${sessionId}".`
    )
  return turnFromRow({ id, sessionId, idx, ...row })
}

/** A World's Sessions for its World page, newest first, with their Turn counts (the Opening included). */
export function listSessionSummaries(
  db: Db,
  worldId: string
): SessionSummary[] {
  return db
    .select({
      id: sessions.id,
      ending: sessions.ending,
      turnCount: count(turns.id),
      createdAt: sessions.createdAt,
      updatedAt: sessions.updatedAt,
    })
    .from(sessions)
    .leftJoin(turns, eq(turns.sessionId, sessions.id))
    .where(eq(sessions.worldId, worldId))
    .groupBy(sessions.id)
    .orderBy(desc(sessions.createdAt), desc(sessions.id))
    .all()
}

/** A Session with the World it is played in, its Turns and its Codex, as `GET /api/sessions/[id]` returns it. */
export function getSessionView(db: Db, id: string): GetSessionResponse {
  const session = getSession(db, id)
  const siblings = db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.worldId, session.worldId))
    .orderBy(asc(sessions.createdAt), asc(sessions.id))
    .all()
  return {
    session,
    sessionNumber: siblings.findIndex((other) => other.id === session.id) + 1,
    world: getWorld(db, session.worldId),
    turns: listTurns(db, id),
    entries: listSessionEntries(db, id),
  }
}
