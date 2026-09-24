# Story logic Entries live in the Codex alongside World Entries

Status: accepted

Exit conditions, Knowledge and Decisive actions are stored as Entries in the same table as locations, characters and Clues, grouped as **Story logic** rather than **World**. They carry the same source and status, so the Author reviews, edits and rejects them with one accept / edit / reject flow, at setup and during play.

The requirements list only six Codex types, all things in the story, and treat Clues, Knowledge and Decisive actions as separate setup outputs. Separate tables would each need their own review surface and status handling, for content the Author must control in exactly the same way.

## Considered Options

- **Separate tables per Story logic kind.** Rejected: three more review surfaces and status models for identical Author control.
- **Name the group "Plan".** Rejected by the Author: it reads as "the OpenAI-drafted part", but the group is defined by what an Entry is, not by who wrote it. Both groups hold author-written (locked) and AI-drafted (proposed) Entries.

## Consequences

- Kind-specific fields live in a per-Entry data column, validated by kind in code.
- The grouping field is named so it cannot be confused with the `worlds` table: `world` versus `story_logic`.
