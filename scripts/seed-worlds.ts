/**
 * Seeds the database with public-domain stories as Worlds and runs setup on
 * each, exactly as the Brief editor's "Run setup" would. Each story lands in
 * `review`, ready for the Author to look over and play.
 *
 *   pnpm seed:worlds --dry-run         validate every Brief; no writes, no calls
 *   pnpm seed:worlds                   create and set up every missing story
 *   pnpm seed:worlds --only "Gold"     only stories whose name contains "Gold"
 *
 * A story whose World already exists (same name) is skipped, so the script can
 * be re-run after a failure. Setup makes paid Drafter and Judge calls, so the
 * stories run one at a time and the script stops at the first failure.
 *
 * Stop `pnpm dev` first: it releases Worlds left in `drafting` on start.
 */
import { parseArgs } from "node:util"

import { documentToBrief } from "@/brief/from-document"
import { sequentialIds } from "@/brief/to-document"
import { getDb } from "@/db/client"
import { listWorldSummaries } from "@/db/worlds"
import { SETUP_STEP_LABELS } from "@/domain/events"
import { nowMs } from "@/lib/time"
import { setupModels } from "@/setup/models"
import { claimSetup, runSetup } from "@/setup/run"
import { createWorld } from "@/worlds/worlds"

import { goldBug } from "./seed-worlds/gold-bug"
import { mostDangerousGame } from "./seed-worlds/most-dangerous-game"
import { speckledBand } from "./seed-worlds/speckled-band"
import type { SeedStory } from "./seed-worlds/story"

const STORIES: SeedStory[] = [speckledBand, mostDangerousGame, goldBug]

const { values: args } = parseArgs({
  options: {
    "dry-run": { type: "boolean", default: false },
    only: { type: "string" },
  },
})

/** Block ids unique to the story, stable across runs. */
function documentOf(story: SeedStory) {
  const slug = story.name.toLowerCase().replace(/[^a-z]+/g, "-")
  return story.document(sequentialIds(slug))
}

/** Throws unless the story's Brief passes §7.1. */
function checkBrief(story: SeedStory) {
  const { validation, issues, warnings } = documentToBrief(documentOf(story))
  for (const warning of warnings)
    console.warn(`  ! ${story.name}: ${warning.message}`)
  if (!validation.success)
    throw new Error(
      `${story.name}: the Brief is invalid: ${issues.map((i) => i.message).join(" ")}`
    )
  const brief = validation.brief
  const hidden = [...brief.characters, ...brief.locations].reduce(
    (n, item) =>
      n +
      item.hiddenFields.length +
      item.keyFacts.filter((f) => f.hidden).length,
    0
  )
  console.info(
    `  ✓ ${story.name}: ${brief.characters.length} characters, ${brief.locations.length} locations, ${brief.arcs.length} Arcs, ${hidden} hidden fields`
  )
}

async function seed(story: SeedStory) {
  const db = getDb()
  if (listWorldSummaries(db).some((w) => w.name === story.name)) {
    console.info(`- ${story.name}: already exists, skipped`)
    return
  }
  const created = createWorld(db, {
    name: story.name,
    briefDoc: documentOf(story),
  })
  const world = claimSetup(db, created.id)
  console.info(`- ${story.name} (${world.id}): setup started`)
  const started = nowMs()
  let failure: string | null = null
  await runSetup({ db, ...setupModels() }, world, {
    emit: (event) => {
      const at = `${(event.at / 1000).toFixed(1)}s`
      if (event.type === "step")
        console.info(
          `    ${at} ${SETUP_STEP_LABELS[event.step]} ${event.status}${event.maxAttempts > 1 ? ` (${event.attempt}/${event.maxAttempts})` : ""}${event.detail ? `: ${event.detail}` : ""}`
        )
      else if (event.type === "gaps")
        for (const gap of event.gaps)
          console.info(`    ${at} gap: ${gap.message}`)
      else if (event.type === "result")
        console.info(
          `    ${at} done: ${event.entries.length} Entries, World is ${event.world.setupStatus}`
        )
      else failure = event.message
    },
    elapsed: () => nowMs() - started,
    signal: new AbortController().signal,
  })
  if (failure) throw new Error(`${story.name}: setup failed: ${failure}`)
}

async function main() {
  const stories = STORIES.filter(
    (s) => !args.only || s.name.toLowerCase().includes(args.only.toLowerCase())
  )
  if (stories.length === 0) throw new Error(`No story matches "${args.only}".`)

  console.info("Checking Briefs")
  stories.forEach(checkBrief)
  if (args["dry-run"]) return

  console.info("Seeding")
  for (const story of stories) await seed(story)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
