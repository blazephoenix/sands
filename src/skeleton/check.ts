/**
 * What stops a Skeleton from being played, and what only looks wrong.
 *
 * Code needs very little from a Skeleton: a story to tell, a Player
 * character, Arcs to move through and Endings to finish on, each with a Kind.
 * Everything else is the Writer's to read, so a missing field there is never
 * an issue here.
 *
 * Names are compared on their plain text (Hidden tags removed), trimmed and
 * case-insensitively, so "the Warden" in an Agenda matches a character named
 * "The Warden".
 */
import { ENDING_KINDS, type Skeleton } from "@/domain/skeleton"

import { plainText } from "./hidden-text"

export type SkeletonIssue = {
  /** Where the issue is, as a path into the Skeleton: `endings.1.kind`. */
  path: string
  message: string
  /** True when a Session cannot start until it is fixed. */
  blocksPlay: boolean
}

export function nameKey(value: string) {
  return plainText(value).trim().toLowerCase()
}

export function isBlank(value: string) {
  return plainText(value).trim() === ""
}

export function checkSkeleton(skeleton: Skeleton): SkeletonIssue[] {
  const issues: SkeletonIssue[] = []
  const blocking = (path: string, message: string) =>
    issues.push({ path, message, blocksPlay: true })
  const warning = (path: string, message: string) =>
    issues.push({ path, message, blocksPlay: false })

  if (isBlank(skeleton.story.title))
    blocking("story.title", "The story needs a Title.")
  if (isBlank(skeleton.story.premise))
    blocking("story.premise", "The story needs a Premise.")

  const characters = new Set(skeleton.characters.map((c) => nameKey(c.name)))
  skeleton.characters.forEach((character, index) => {
    if (isBlank(character.name))
      blocking(`characters.${index}.name`, "Every character needs a name.")
    character.ties.forEach((tie, tieIndex) => {
      if (!isBlank(tie.toward) && !characters.has(nameKey(tie.toward)))
        warning(
          `characters.${index}.ties.${tieIndex}.toward`,
          `“${plainText(tie.toward)}” is not a character in this Skeleton.`
        )
    })
  })
  duplicates(skeleton.characters.map((c) => c.name)).forEach((index) =>
    blocking(
      `characters.${index}.name`,
      "Two characters share this name. Give each character its own."
    )
  )

  const player = skeleton.playSettings.playerCharacter
  if (isBlank(player))
    blocking(
      "playSettings.playerCharacter",
      "Name the Player character: the character the Player controls."
    )
  else if (!characters.has(nameKey(player)))
    blocking(
      "playSettings.playerCharacter",
      `The Player character, “${plainText(player)}”, is not one of the characters. Add their card or fix the name.`
    )

  if (skeleton.arcs.length === 0)
    blocking("arcs", "The story needs at least one Arc.")
  const arcs = new Set(skeleton.arcs.map((arc) => nameKey(arc.name)))
  skeleton.arcs.forEach((arc, index) => {
    if (isBlank(arc.name))
      blocking(`arcs.${index}.name`, "Every Arc needs a name.")
    arc.agendas.forEach((agenda, agendaIndex) => {
      if (
        !isBlank(agenda.character) &&
        !characters.has(nameKey(agenda.character))
      )
        warning(
          `arcs.${index}.agendas.${agendaIndex}.character`,
          `“${plainText(agenda.character)}” is not a character in this Skeleton.`
        )
    })
  })
  duplicates(skeleton.arcs.map((arc) => arc.name)).forEach((index) =>
    blocking(`arcs.${index}.name`, "Two Arcs share this name.")
  )

  const checkEarliestArc = (path: string, value: string) => {
    if (!isBlank(value) && !arcs.has(nameKey(value)))
      blocking(
        path,
        `Earliest Arc “${plainText(value)}” is not one of the Arcs.`
      )
  }
  skeleton.promises.forEach((promise, index) =>
    checkEarliestArc(`promises.${index}.earliestArc`, promise.earliestArc)
  )
  skeleton.secrets.forEach((secret, index) =>
    checkEarliestArc(`secrets.${index}.earliestArc`, secret.earliestArc)
  )

  if (skeleton.endings.length === 0)
    blocking("endings", "The story needs at least one Ending.")
  skeleton.endings.forEach((ending, index) => {
    if (isBlank(ending.name))
      blocking(`endings.${index}.name`, "Every Ending needs a name.")
    if (!(ENDING_KINDS as readonly string[]).includes(nameKey(ending.kind)))
      blocking(
        `endings.${index}.kind`,
        `An Ending's Kind is good, bad or neutral${isBlank(ending.kind) ? "" : `, not “${plainText(ending.kind)}”`}.`
      )
    if (isBlank(ending.trigger))
      blocking(
        `endings.${index}.trigger`,
        "Every Ending needs a Trigger: what must happen in play for it to fire."
      )
    checkEarliestArc(`endings.${index}.earliestArc`, ending.earliestArc)
  })
  duplicates(skeleton.endings.map((ending) => ending.name)).forEach((index) =>
    blocking(
      `endings.${index}.name`,
      "Two Endings share this name. The Writer names the Ending it reached, so each needs its own."
    )
  )

  return issues
}

/** Whether a Session can start in this Skeleton. */
export function isPlayable(skeleton: Skeleton) {
  return checkSkeleton(skeleton).every((issue) => !issue.blocksPlay)
}

/** Indexes of non-blank names already used earlier in the list. */
function duplicates(names: readonly string[]) {
  const seen = new Set<string>()
  const repeated: number[] = []
  names.forEach((name, index) => {
    const key = nameKey(name)
    if (!key) return
    if (seen.has(key)) repeated.push(index)
    seen.add(key)
  })
  return repeated
}
