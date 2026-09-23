# A Session copies its World's Entries

Status: accepted

Starting a Session copies every non-rejected Entry of its World into rows owned by that Session. Codex edits during play change only that Session's copies. Two Sessions of one World therefore start identical, which the variation claim needs, and a Session's Codex is a frozen snapshot plus its own changes.

## Considered Options

- **Store only per-Session overrides and merge them with the World's Entries on every read.** Rejected: every Codex read becomes a merge, and an edit to the World after a Session starts would leak into that running Session. The saving is a few hundred rows per World, which is nothing at this scale.

## Consequences

- A Session copy keeps a pointer to the World Entry it came from, so the two can be compared.
- Edits to a World after a Session starts never reach that Session.
