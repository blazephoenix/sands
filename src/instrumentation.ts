/**
 * Runs once when the Next server starts, before it handles a request. Next
 * skips it during `next build`.
 *
 * Returns any World a stopped server left `drafting` to `draft` (spec §13: a
 * failed setup leaves the World in draft). Setup runs only inside the server
 * process, so no run survives a restart, and a claim left behind would
 * otherwise lock the Brief and refuse both setup and Delete for good. This
 * assumes one server process runs setups against the database; a second
 * process sharing the file (a future Replay runner, spec §12) would need a
 * stale-claim expiry instead.
 *
 * Likewise marks as failed any Turn whose Background work a stopped server
 * left pending (spec §13), so the Session page stops waiting on it.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return
  const { getDb } = await import("@/db/client")
  const { releaseInterruptedSetups } = await import("@/db/worlds")
  const { failInterruptedBackgroundWork } = await import("@/engine/background")
  const released = releaseInterruptedSetups(getDb())
  if (released > 0) {
    console.info(
      `[sands] returned ${released} World(s) left drafting by a stopped server to draft`
    )
  }
  const failed = failInterruptedBackgroundWork(getDb())
  if (failed > 0) {
    console.info(
      `[sands] marked ${failed} Turn(s) whose Background work a stopped server cut off as failed`
    )
  }
}
