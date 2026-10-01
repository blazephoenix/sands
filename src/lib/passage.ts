/**
 * A Passage's paragraphs. The Writer separates paragraphs with a blank line,
 * but a single line break (a line of dialogue) starts one too.
 */
export function passageParagraphs(text: string): string[] {
  return text
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0)
}
