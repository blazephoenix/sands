# Story mechanics are Brief data, not code

Status: accepted

This is a writing harness, not a mystery engine. Code knows only generic concepts: Arcs with Exit conditions, Clues, Knowledge gated by Band, Decisive actions with required Clues, and Reputation. Everything specific to one story, such as "this Decisive action requires these three Clues", lives in the World's Entries, drafted at setup and reviewed by the Author. Every World is data the Author writes; the 1888 London story in the requirements' appendix is only the test World.

The requirements were first written in mystery vocabulary (antagonist, capture condition, arrest), and building that shape directly would have been faster. We declined because the thesis is whether an AI can be creative within any human-authored constraints; a harness that only runs detective stories tests a narrower claim.

The requirements have since been rewritten in genre-agnostic terms (2026-09-24).

## Considered Options

- **Mystery-shaped code now, generalize later.** Rejected: the demo would be evidence for a mystery engine, not for the thesis.
- **No mechanics beyond Arcs and the Codex.** Rejected: see ADR-0001.

## Consequences

- Free prose and custom fields in the Brief reach the Writer and the Judge, but code cannot act on them. Only typed Brief fields drive mechanics.
