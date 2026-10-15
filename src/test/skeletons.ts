/**
 * A small playable Skeleton for tests, genre-free on purpose: just enough
 * for `checkSkeleton` to pass.
 */
import { emptySkeleton, type Skeleton } from "@/domain/skeleton"
import { hidden } from "@/skeleton/hidden-text"

export function playableSkeleton(): Skeleton {
  const skeleton = emptySkeleton()
  return {
    ...skeleton,
    story: {
      ...skeleton.story,
      title: "The Test Story",
      premise: "Two people want the same thing.",
    },
    playSettings: { ...skeleton.playSettings, playerCharacter: "Ada" },
    characters: [
      {
        name: "Ada",
        aliases: "",
        role: "The Player character",
        core: "Curious",
        want: "To find out the truth",
        wantPriority: "",
        fearOrWeakness: "",
        lines: "",
        speech: "",
        knows: "",
        believes: "",
        ties: [],
      },
      {
        name: "Ben",
        aliases: "",
        role: "Rival",
        core: "Guarded",
        want: "To keep a secret",
        wantPriority: "",
        fearOrWeakness: "",
        lines: "",
        speech: "",
        knows: hidden("Where the key is."),
        believes: "",
        ties: [
          {
            toward: "Ada",
            wants: "Her trust",
            friction: "",
            startsAs: "Strangers",
          },
        ],
      },
    ],
    arcs: [
      {
        name: "Arrival",
        description: "",
        function: "Ada meets Ben.",
        setPieces: "",
        mustLandMoments: "",
        stakes: "",
        ifLandedEarly: "",
        agendas: [],
      },
    ],
    endings: [
      {
        name: "Found",
        kind: "good",
        trigger: "Ada finds the key.",
        earliestArc: "Arrival",
      },
      {
        name: "Lost",
        kind: "bad",
        trigger: "The key is destroyed.",
        earliestArc: "",
      },
    ],
  }
}
