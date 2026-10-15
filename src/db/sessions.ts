/**
 * Sessions and their Turns in the database, parsed with their contracts on
 * the way in and out.
 */
import { asc, desc, eq, sql } from "drizzle-orm"

import {
  sessionSchema,
  turnSchema,
  type Session,
  type Turn,
} from "@/domain/session"
import { toIso } from "@/lib/time"

import type { Db } from "./client"
import { pgErrorCode, StoreError, UNIQUE_VIOLATION } from "./errors"
import { sessions, turns, type SessionRow, type TurnRow } from "./schema"

function sessionFromRow(row: SessionRow): Session {
  return sessionSchema.parse({
    ...row,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  } satisfies Session)
}

function turnFromRow(row: TurnRow): Turn {
  const { idx, ...rest } = row
  return turnSchema.parse({
    ...rest,
    index: idx,
    createdAt: toIso(row.createdAt),
  } satisfies Turn)
}

export async function getSession(db: Db, id: string): Promise<Session> {
  const [row] = await db.select().from(sessions).where(eq(sessions.id, id))
  if (!row)
    throw new StoreError(
      "not_found",
      `There is no Session "${id}". It may have been deleted with its World.`
    )
  return sessionFromRow(row)
}

export async function insertSession(db: Db, session: Session): Promise<void> {
  await db.insert(sessions).values(sessionSchema.parse(session))
}

/** Records the Ending a Session reached. */
export async function endSession(
  db: Db,
  session: Session,
  at: string
): Promise<void> {
  const parsed = sessionSchema.parse(session)
  await db
    .update(sessions)
    .set({ ending: parsed.ending, updatedAt: at })
    .where(eq(sessions.id, parsed.id))
}

export async function touchSession(db: Db, id: string, at: string) {
  await db.update(sessions).set({ updatedAt: at }).where(eq(sessions.id, id))
}

/**
 * Stores a Turn. A second Turn with the same index (another tab played the
 * same Turn first) is refused as a conflict.
 */
export async function insertTurn(db: Db, turn: Turn): Promise<void> {
  const { index, ...rest } = turnSchema.parse(turn)
  try {
    await db.insert(turns).values({ ...rest, idx: index })
  } catch (error) {
    if (pgErrorCode(error) === UNIQUE_VIOLATION)
      throw new StoreError(
        "conflict",
        "This Turn was already played, maybe in another tab. Reload the Session to see it."
      )
    throw error
  }
}

/** A Session's Turns, Opening first. */
export async function listTurns(db: Db, sessionId: string): Promise<Turn[]> {
  const rows = await db
    .select()
    .from(turns)
    .where(eq(turns.sessionId, sessionId))
    .orderBy(asc(turns.idx))
  return rows.map(turnFromRow)
}

/** A World's Sessions, newest first, with how many Turns each has. */
export async function listSessionSummaries(db: Db, worldId: string) {
  const rows = await db
    .select({
      session: sessions,
      turnCount:
        sql<number>`(select count(*) from ${turns} where ${turns.sessionId} = ${sessions.id})`.mapWith(
          Number
        ),
    })
    .from(sessions)
    .where(eq(sessions.worldId, worldId))
    .orderBy(desc(sessions.createdAt))
  return rows.map((row) => ({
    session: sessionFromRow(row.session),
    turnCount: row.turnCount,
  }))
}
