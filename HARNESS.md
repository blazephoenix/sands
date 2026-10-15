# The Creative Harness

A writer's rules, such as a character sheet, story bible or voice doc, become checks that every AI output is graded against at runtime, by a model that didn't write it.

## The problem

A rules doc only suggests behavior to an LLM, and nothing checks whether the model followed it. Over long sessions, characters drift and facts get lost. When someone is watching, they fix it by hand. When a stranger is reading, nobody catches it. When you push the rules harder, the writing goes stale. Sands runs show this even on public-domain stories like *The Wonderful Wizard of Oz* and Jules Verne.

## The three parts

1. **The rulebook.** The author's skeleton: characters, world, arcs, facts. It lives outside the chat, the author edits it, and every future session follows the edits.
2. **The judge.** A separate model (Jev) checks each output against the rules as yes/no questions. Code checks rules like banned words. Taste stays with the writer model and the author, because a judge can't grade it reliably.
3. **State.** Code tracks which arc the story is in, which facts are established, and which endings remain reachable. A transcript can't hold that reliably.

## Operating principle

The writer writes freely and the judge watches. The harness steps in only on hard breaks, like a contradicted fact or a dead character speaking. The writer model's default voice stays intact until the moment the story breaks.

## The open question

Can you enforce an author's rules without killing what makes the writing good? Sands runs and [NCP-Bench](https://arxiv.org/pdf/2608.08160) both show consistency trading against surprise and player agency. The harness is a bet that a narrow, watch-first judge beats that tradeoff.

## Why interactive fiction first

It's the hardest case. The author isn't in the session, so every drift reaches the reader. If the rules hold there, they should hold where an author reads every line. Sands is the testbed. A platform comes later, and only if readers prefer the output.

## Where it transfers

The same logic applies to anything written against a guideline: brand voice docs, series bibles, house style. Each rule becomes a check instead of a hope.

## What four months produce

- A test of when plain Claude starts drifting, across genres and user-written stories
- A test of whether the harness preserves the writer model's voice while keeping the skeleton consistent
- An open harness and a public writeup, whichever way the results go

See [issue #53](https://github.com/blazephoenix/sands/issues/53) for the study design.

## What would prove it wrong

Blind readers prefer plain Claude with the story bible, or can't tell the difference. Then the harness isn't needed, and that result gets published.
