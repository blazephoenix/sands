# Story mechanics are Brief data, not code

Status: accepted

This is a writing harness, not a mystery engine. Code knows only generic concepts: Arcs with Exit conditions, Clues, Knowledge gated by Band, Decisive actions with required Clues, and Reputation. Everything specific to one story, such as "arresting Max Rober requires these three Clues", lives in the World's Entries, drafted at setup and reviewed by the Author. The 1888 London murder case is the only World played in the first demo, and it is data.

The requirements were first written in mystery vocabulary (antagonist, capture condition, arrest), and building that shape directly would have been faster. They have since been rewritten in genre-agnostic terms, and their 1888 story is kept only as the test World. We declined because the thesis is whether an AI can be creative within any human-authored constraints; a harness that only runs detective stories tests a narrower claim.

## Considered Options

- **Mystery-shaped code now, generalize later.** Rejected: the demo would be evidence for a mystery engine, not for the thesis.
- **Fully genre-agnostic, with no mechanics beyond Arcs and the Codex.** Rejected: see ADR-0001.

## Consequences

- Free prose and custom fields in the Brief reach the Writer and the Judge, but code cannot act on them. Only typed Brief fields drive mechanics.
