# BlockNote for every editing surface

Status: accepted

The Brief editor, the setup review and the in-play Codex pane are one BlockNote editor with custom typed blocks (Character, Arc, Location, Clue and so on) and free prose between them. Typed blocks drive mechanics; free prose becomes locked Brief text that only the Writer and the Judge read. References between Entries are inline mentions that can only point at Entries that exist.

The Author wanted a Notion-like authoring experience. BlockNote is a Notion-style editor built on Tiptap, licensed MPL-2.0, and ships the slash menu, drag handles and nesting we would otherwise build.

## Considered Options

- **A form styled like a document.** Rejected by the Author: too plain for the authoring experience wanted.
- **Hand-built Tiptap cards.** Rejected as too simple, and more work than BlockNote for the same shell.
- **Tiptap's Notion-like template.** Rejected: it requires a paid Tiptap plan for production use under the Tiptap Pro License.

## Consequences

- Only MPL-2.0 BlockNote packages are used; the `@blocknote/xl-*` packages are GPL-3.0 or commercial.
- Unverified: whether a typed block holds several labelled multi-paragraph fields with per-field Hidden toggles. It is tested first; the fallback is plain Tiptap with custom nodes, the free drag-handle extension and a slash menu on `@tiptap/suggestion`.
- The editor costs about a day of the two before the first demo, which is why the baseline is expected to be cut (ADR-0012).
