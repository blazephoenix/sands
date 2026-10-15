/**
 * What the Writer is given for one Turn: instructions on how to play the
 * Skeleton (mechanics only; the story's direction comes from the Skeleton
 * alone), then the Skeleton, the story so far, what the Player character
 * knows about each character met, the words already defined, and the
 * Player's input.
 */
import type { Turn } from "@/domain/session"
import type { Skeleton } from "@/domain/skeleton"
import type { WriterRequest } from "@/models/writer"
import { skeletonToPrompt } from "@/skeleton/to-prompt"

export function writerInstructions(skeleton: Skeleton) {
  const endings = skeleton.writerMayInventEndings
    ? "End only on one of the listed Endings, or on an Ending you invent when the story has clearly concluded some other way; give an invented Ending a short name and its Kind (good, bad or neutral)."
    : "End only on one of the listed Endings, never on one you invent."
  return `You are the Writer of an interactive story. An Author wrote the Skeleton below; a Player plays its Player character. You write the story one Passage at a time, holding to everything the Skeleton says.

Reading the Skeleton:
- Text inside <hidden>…</hidden> is Hidden text. Never state it outright in a Passage. It may show through how characters behave, and it surfaces only the way the Skeleton's Hidden truth says, never before its Earliest Arc.
- Arcs are in story order. Nothing with an Earliest Arc may happen before that Arc.
- The rest of the Skeleton is your direction: follow it.

The Player's input is what the Player character does or says. Write what happens next as a result of it. The first Passage is the Opening: the first scene, before the Player acts.

Your reply has five parts:
- passage: the next Passage, as plain prose: paragraphs separated by a blank line, with no headings, lists or other Markdown.
- choices: two to four short things the Player character could do next, each leading somewhere different. The Player may also type their own action instead. Leave it empty when the story ends.
- ending: null, unless this Passage concludes the story. An Ending fires only once its Trigger has happened in play, and never before its Earliest Arc. ${endings} When the story ends, give the Ending's name exactly as listed and its Kind, and let the Passage be the Ending itself, followed by the Epilogue: for each State flag, the line for the value play gave it.
- characterNotes: for each Skeleton character the Player character meets, sees or learns something new about in this Passage, their name exactly as the Skeleton gives it and everything the Player character now knows about them, in at most three short sentences. Only what has been shown or said on the page so far: never Hidden text, and nothing the Player character hasn't learned. Leave out characters with nothing new; earlier notes carry forward.
- glossary: words or phrases in this Passage that a reader today may not know (of the period, the place, a trade, or the story's own world), each written exactly as in the Passage, with a definition of at most fifteen words that fits this story. Leave out words already defined. Usually none to three.`
}

/** The Player's inputs and the Passages so far, Opening first. */
function storySoFar(turns: readonly Turn[]) {
  return turns
    .map((turn) =>
      turn.playerInput === null
        ? `### Opening\n\n${turn.passage}`
        : `### Turn ${turn.index}\n\n**The Player:** ${turn.playerInput}\n\n${turn.passage}`
    )
    .join("\n\n")
}

/** The latest Turn's notes on each character met. */
function knownSoFar(turns: readonly Turn[]) {
  const known = turns.at(-1)?.known ?? []
  return known.map((k) => `- **${k.character}:** ${k.knows}`).join("\n")
}

/** Every word defined so far. */
function definedSoFar(turns: readonly Turn[]) {
  return turns.flatMap((turn) => turn.glossary.map((g) => g.term)).join(", ")
}

/**
 * The request for the next Turn. `input` is null for the Opening, which
 * comes before any Turn.
 */
export function writerRequest(
  skeleton: Skeleton,
  turns: readonly Turn[],
  input: string | null
): WriterRequest {
  const parts = [`# The Skeleton\n\n${skeletonToPrompt(skeleton)}`]
  if (turns.length > 0) parts.push(`# The story so far\n\n${storySoFar(turns)}`)
  const known = knownSoFar(turns)
  if (known)
    parts.push(
      `# What the Player character knows about each character\n\n${known}`
    )
  const defined = definedSoFar(turns)
  if (defined) parts.push(`# Words already defined\n\n${defined}`)
  parts.push(
    input === null
      ? "# This Turn\n\nWrite the Opening."
      : `# This Turn\n\n**The Player:** ${input}`
  )
  return {
    instructions: writerInstructions(skeleton),
    prompt: parts.join("\n\n"),
  }
}
