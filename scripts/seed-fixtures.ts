/**
 * Stores the fixture Skeletons (`src/fixtures/`) as Worlds in the dev
 * database, so a playtest can start without writing a Skeleton first.
 *
 *   pnpm seed:fixtures            # adds the fixtures not already there, by name
 *   pnpm seed:fixtures --replace  # also overwrites the Skeleton of ones that are
 *
 * `--replace` discards any edits made to those Worlds' Skeletons in the
 * editor; their Sessions keep the Skeleton they started with.
 */
import { closeDb, getDb } from "@/db/client"
import { listWorldsWithSessionCounts, updateWorld } from "@/db/worlds"
import { FIXTURES } from "@/fixtures"
import { nowIso } from "@/lib/time"
import { skeletonToDocument } from "@/skeleton/document"
import { plainText } from "@/skeleton/hidden-text"
import { createWorld } from "@/worlds/worlds"

async function main() {
  const replace = process.argv.includes("--replace")
  const db = await getDb()
  const existing = await listWorldsWithSessionCounts(db)
  for (const skeleton of FIXTURES) {
    const name = plainText(skeleton.story.title).trim()
    const world = existing.find((row) => row.world.name === name)?.world
    if (!world) {
      await createWorld(db, { skeleton })
      console.info(`[seed] added “${name}”`)
    } else if (replace) {
      await updateWorld(db, {
        ...world,
        skeleton,
        document: skeletonToDocument(skeleton),
        updatedAt: nowIso(),
      })
      console.info(`[seed] replaced the Skeleton of “${name}”`)
    } else {
      console.info(
        `[seed] kept “${name}”, already there (--replace overwrites it)`
      )
    }
  }
}

main()
  .catch((error: unknown) => {
    console.error("[seed] failed:", error)
    process.exitCode = 1
  })
  .finally(() => closeDb())
