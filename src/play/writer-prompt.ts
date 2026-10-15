/**
 * What the Writer is given for one Turn: instructions on how to play the
 * Skeleton (mechanics only; the story's direction comes from the Skeleton
 * alone), then the Skeleton, the story so far, and the Player's input.
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

Your reply has three parts:
- passage: the next Passage, as plain prose: paragraphs separated by a blank line, with no headings, lists or other Markdown.
- choices: two to four short things the Player character could do next, each leading somewhere different. The Player may also type their own action instead. Leave it empty when the story ends.
- ending: null, unless this Passage concludes the story. An Ending fires only once its Trigger has happened in play, and never before its Earliest Arc. ${endings} When the story ends, give the Ending's name exactly as listed and its Kind, and let the Passage be the Ending itself, followed by the Epilogue: for each State flag, the line for the value play gave it.`
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
