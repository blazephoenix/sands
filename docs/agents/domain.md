# Domain Docs

How agents should consume this repo's domain documentation.

This is a **single-context** repo: one glossary and one ADR directory.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root. The ubiquitous language, with the wording to avoid for each term.
- **`docs/adr/`**. Read the ADRs that touch the area you are about to work in. Only ADR-0001 and ADR-0002 stand; every other decision was cleared on 2026-10-15 when Sands was stripped to the Skeleton and the Writer, and is in git history only. Do not treat deleted ADRs, the old specs or the map in issue #25 as precedent.

## Use the glossary's vocabulary

When your output names a domain concept (a type, a table, a test name, UI copy, a commit message), use the term as defined in `CONTEXT.md`. Do not drift to the synonyms each entry lists under `_Avoid_`.

If the concept you need is not in the glossary yet, that is a signal: either you are inventing language the project does not use (reconsider), or there is a real gap (resolve it with `/domain-modeling` and add it).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding it:

> _Contradicts ADR-NNNN (its title) but worth reopening because..._

ADRs are cheap to reverse on purpose: reversing one means writing a new ADR that supersedes it and updating the old one's `Status:` line.
