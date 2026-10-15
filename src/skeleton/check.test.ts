import { describe, expect, it } from "vitest"

import { emptySkeleton } from "@/domain/skeleton"
import { playableSkeleton } from "@/test/skeletons"

import { checkSkeleton, isPlayable } from "./check"
import { hidden } from "./hidden-text"

const blocking = (skeleton: Parameters<typeof checkSkeleton>[0]) =>
  checkSkeleton(skeleton)
    .filter((issue) => issue.blocksPlay)
    .map((issue) => issue.path)

describe("checkSkeleton", () => {
  it("passes a playable Skeleton", () => {
    expect(checkSkeleton(playableSkeleton())).toEqual([])
    expect(isPlayable(playableSkeleton())).toBe(true)
  })

  it("lists what an empty Skeleton needs before it can be played", () => {
    expect(blocking(emptySkeleton())).toEqual([
      "story.title",
      "story.premise",
      "playSettings.playerCharacter",
      "arcs",
      "endings",
    ])
  })

  it("matches names on their plain text, ignoring case and Hidden tags", () => {
    const skeleton = playableSkeleton()
    skeleton.playSettings.playerCharacter = hidden("ADA")
    expect(isPlayable(skeleton)).toBe(true)
  })

  it("blocks play on a Player character, Earliest Arc or Ending Kind that doesn't resolve", () => {
    const skeleton = playableSkeleton()
    skeleton.playSettings.playerCharacter = "Cyd"
    skeleton.endings[0].earliestArc = "Departure"
    skeleton.endings[1].kind = "tragic"
    expect(blocking(skeleton)).toEqual([
      "playSettings.playerCharacter",
      "endings.0.earliestArc",
      "endings.1.kind",
    ])
  })

  it("blocks two Endings with one name, since the Writer names the Ending it reached", () => {
    const skeleton = playableSkeleton()
    skeleton.endings[1].name = "found"
    expect(blocking(skeleton)).toEqual(["endings.1.name"])
  })

  it("only warns about a Tie or an Agenda naming someone who isn't a character", () => {
    const skeleton = playableSkeleton()
    skeleton.characters[1].ties[0].toward = "Cyd"
    skeleton.arcs[0].agendas.push({
      character: "Dot",
      want: "",
      steps: "",
      ifBlocked: "",
    })
    const issues = checkSkeleton(skeleton)
    expect(issues.map((issue) => [issue.path, issue.blocksPlay])).toEqual([
      ["characters.1.ties.0.toward", false],
      ["arcs.0.agendas.0.character", false],
    ])
    expect(isPlayable(skeleton)).toBe(true)
  })
})
