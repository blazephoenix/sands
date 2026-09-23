import type { Metadata } from "next"

import { SessionPage } from "./session-page"

export const metadata: Metadata = { title: "Session" }

/** `/sessions/[id]`: play a Session (spec §11). Keyed by id, so a new Session starts from a clean page. */
export default async function SessionRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <SessionPage key={id} sessionId={id} />
}
