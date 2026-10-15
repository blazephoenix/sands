import type { Metadata } from "next"

import { SessionPage } from "./session-page"

export const metadata: Metadata = { title: "Session" }

/** `/sessions/[id]`: the Player plays a Session; the harness pane shows what the Writer saw. */
export default async function Page(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  return <SessionPage key={id} sessionId={id} />
}
