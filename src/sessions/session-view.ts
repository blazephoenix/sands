/**
 * `GET /api/sessions/[id]` (spec §5.2): a Session with the World it is played
 * in, its Turns and its Codex.
 */
import { asc, eq } from "drizzle-orm"

import type { Db } from "@/db/client"
import { listSessionEntries } from "@/db/entries"
import { sessions } from "@/db/schema"
import { getSession, listTurns } from "@/db/sessions"
import { getWorld } from "@/db/worlds"
import type { GetSessionResponse } from "@/domain/session-view"

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
