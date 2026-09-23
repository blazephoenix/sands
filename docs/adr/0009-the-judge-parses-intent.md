# The Judge parses player intent, not the Drafter

Status: accepted

Reading a player input (its intent, its target, its Classification) is one Judge call of three choice questions, with escape options for "other" and "not in the Codex". The requirements assigned intent parsing to the small OpenAI model. We moved it because intent parsing is choosing from a known set, the declared actions and the Codex's targets, which is the Judge's native shape: 70–500 ms, typed answers, and no parsing of generated text on the critical path.

## Considered Options

- **Drafter parses intent with structured output.** Rejected: a slower, costlier generation call for a selection task, sitting on every Turn's critical path.

## Consequences

- The Drafter only does work that needs generated text: setup drafting and naming new characters found in Passages.
- The unplanned-Clue check that the requirements placed in extraction also moves to the Judge, as a Rule asked in the same call that judges the Drafts.
