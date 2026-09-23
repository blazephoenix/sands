# BlockNote for every editing surface

Status: accepted

The Brief editor and the in-play Codex pane are one BlockNote editor: section headings (Character, Arc, Location, Clue and so on) with `Label: value` fields, and free prose between them (ADR-0013). Sections drive mechanics; free prose becomes locked Brief text that only the Writer and the Judge read. The setup review is not an editor surface: it is a list of what setup drafted beside one Entry card, and it opens the same editor only to edit that one Entry. References between Entries are inline mentions that can only point at Entries that exist.

The Author wanted a Notion-like authoring experience. BlockNote is a Notion-style editor built on Tiptap, licensed MPL-2.0, and ships the slash menu, drag handles and nesting we would otherwise build.

## Considered Options

- **A form styled like a document.** Rejected by the Author: too plain for the authoring experience wanted.
- **Hand-built Tiptap cards.** Rejected as too simple, and more work than BlockNote for the same shell.
- **Tiptap's Notion-like template.** Rejected: it requires a paid Tiptap plan for production use under the Tiptap Pro License.

## Consequences

- Only MPL-2.0 BlockNote packages are used; the `@blocknote/xl-*` packages are GPL-3.0 or commercial.
- Settled: a typed block could hold labelled, Hidden-able fields (the spec §7.4 test passed), but the Author chose plain documents with `Label: value` fields instead (ADR-0013). The Tiptap fallback was not needed.
- The setup review was first built as one editor document of every Entry, with Accept and Reject in the ⠿ menu. The Author found it unclear what needed a decision, so on 2026-09-23 it became a review list and card: only drafted Entries are decisions, Judge-flagged ones come first, each says why setup drafted it, and the actions are Approve, Edit and Remove.
- The editor costs about a day of the two before the first demo, which is why the baseline is expected to be cut (ADR-0012).
